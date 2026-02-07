'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Trash2, Play, Pause, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser, useFirestore, initializeFirebase } from '@/firebase';

interface AudioRecorderProps {
    ownerId: string;
    onAudioReady: (url: string, duration: number) => void;
    onAudioRemoved: () => void;
}

export function AudioRecorder({ ownerId, onAudioReady, onAudioRemoved }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);

            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => {
                    if (prev >= 60) { // Max 60 seconds
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            toast({
                title: "Микрофон олдсонгүй",
                description: "Та микрофон ашиглах зөвшөөрөл өгнө үү.",
                variant: "destructive",
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const uploadAudio = async () => {
        if (!audioBlob) return;
        setIsUploading(true);

        try {
            // Initialize storage manually if needed or get from firebase exports
            // We need to make sure we use the same app instance or config
            // Using `getStorage` from `firebase/storage` needs `firebaseApp`.
            // Our hook `useFirestore` returns db, but we don't have `useStorage` hook yet.
            // We can import `storage` from `src/firebase/index` if we exported it correctly.
            // Or re-initialize.

            // Let's assume we can get it from our updated `src/firebase/index.ts`.
            // But since hooks are inside context usually, accessing `storage` directly might be better via a new hook or just direct import if singleton.
            // Let's try importing `initializeFirebase` and getting storage.
            const { storage } = initializeFirebase();

            if (!storage) throw new Error("Storage not initialized");

            const filename = `voice-wisprs/${ownerId}/${Date.now()}.webm`;
            const storageRef = ref(storage, filename);

            await uploadBytes(storageRef, audioBlob);
            const url = await getDownloadURL(storageRef);

            onAudioReady(url, recordingDuration);
            toast({ title: "Амжилттай", description: "Дуут зурвас хадгалагдлаа." });

        } catch (e) {
            console.error("Upload error:", e);
            toast({ title: "Алдаа", description: "Дуут зурвас илгээхэд алдаа гарлаа.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    // We should probably upload ONLY when the user Submits the form.
    // But `ComplimentForm` handles submission. 
    // It's better to upload *before* form submit or *during* form submit.
    // If we assume `onAudioReady` is called with the BLOB or URL?
    // If we return URL, it means we must upload first.
    // Let's auto-upload when recording stops? Or let user confirm?
    // UI-wise: Record -> Stop -> Review (Play/Delete) -> (Implicitly ready to submit).
    // The actual upload can happen when `ComplimentForm` submits. 
    // But passing Blob to Server Action is not directly supported (needs FormData). 
    // And `submitComplimentAction` currently takes JSON args mostly.
    // Best practice: Upload from client to Storage, get URL, send URL to Server Action.

    // So, we need to expose the upload function or do it automatically.
    // Let's do it automatically after stop? No, user might want to re-record.
    // Let's expose `audioBlob` and let parent handle upload? 
    // Or handle upload internally and just give parent the URL when done.
    // Let's handle upload internally but maybe trigger it via ref?
    // OR simpler: When recording stops, we show "Uploading..." then "Ready".

    // Let's go with: Record -> Stop -> "Confirm/Save"? 
    // Or just "Recorded". And when parent submits, we act?
    // But `ComplimentForm` doesn't know about `audioBlob` logic.

    // Alternative: The `AudioRecorder` has a prop `uploadOnReady`. 
    // Or just upload immediately after recording stops (with undo/delete option). 
    // This is easiest. 
    useEffect(() => {
        if (audioBlob && !isUploading && !audioUrl?.startsWith('http')) {
            // It has a local blob url.
            // We can wait for user to click "Submit" on parent form?
            // BUT parent form submit is `submitComplimentAction`.
            // We can't easily hook into that process to upload *then* call action.
            // Unless we pass a `upload` function to parent.

            // Let's just upload immediately for now to keep it simple.
            // If user cancels, we have a stray file. We can clean up later or use cloud functions.
            uploadAudio();
        }
    }, [audioBlob]);


    const togglePlay = () => {
        if (!audioPlayerRef.current) return;
        if (isPlaying) {
            audioPlayerRef.current.pause();
        } else {
            audioPlayerRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioPlayerRef.current && audioPlayerRef.current.ended) {
            setIsPlaying(false);
        }
    };

    const deleteRecording = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingDuration(0);
        onAudioRemoved();
        // TODO: Delete from storage if already uploaded?
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (audioUrl) {
        return (
            <div className="flex items-center gap-2 p-2 rounded-lg border bg-secondary/30">
                <Button type="button" variant="ghost" size="icon" onClick={togglePlay} className="h-8 w-8">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div className="flex-1 text-xs font-mono">
                    {formatTime(recordingDuration)}
                </div>
                {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                    <Button type="button" variant="ghost" size="icon" onClick={deleteRecording} className="h-8 w-8 hover:text-destructive text-muted-foreground">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
                <audio
                    ref={audioPlayerRef}
                    src={audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                />
            </div>
        );
    }

    return (
        <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            onClick={isRecording ? stopRecording : startRecording}
            className={isRecording ? "animate-pulse gap-2" : "gap-2"}
        >
            {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
            {isRecording ? formatTime(recordingDuration) : "Дуут зурвас"}
        </Button>
    );
}
