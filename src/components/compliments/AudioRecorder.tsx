'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Trash2, Play, Pause, Loader2, Send, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { initializeFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioRecorderProps {
    ownerId: string;
    onAudioReady: (url: string, duration: number) => void;
    onAudioRemoved: () => void;
    compact?: boolean;
}

export function AudioRecorder({ ownerId, onAudioReady, onAudioRemoved, compact }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null); // Local URL for preview
    const [remoteUrl, setRemoteUrl] = useState<string | null>(null); // Uploaded URL
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [uploadError, setUploadError] = useState(false);

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

    // Auto-upload when blob is ready
    useEffect(() => {
        if (audioBlob && !remoteUrl && !isUploading && !uploadError) {
            uploadAudio();
        }
    }, [audioBlob, remoteUrl, isUploading, uploadError]);

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
            setUploadError(false);

            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => {
                    if (prev >= 60) {
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
        setUploadError(false);

        try {
            const { storage } = initializeFirebase();
            if (!storage) throw new Error("Storage not initialized");

            const filename = `voice-wisprs/${ownerId}/${Date.now()}.webm`;
            const storageRef = ref(storage, filename);

            await uploadBytes(storageRef, audioBlob);
            const url = await getDownloadURL(storageRef);

            setRemoteUrl(url);
            onAudioReady(url, recordingDuration);
            // toast({ title: "Амжилттай", description: "Дуут зурвас хадгалагдлаа." }); // Too noisy?

        } catch (e) {
            console.error("Upload error:", e);
            setUploadError(true);
            toast({ title: "Алдаа", description: "Дуут зурвас илгээхэд алдаа гарлаа.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

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
        setRemoteUrl(null);
        setRecordingDuration(0);
        setUploadError(false);
        onAudioRemoved();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // State: Recording
    if (isRecording) {
        return (
            <div className="w-full flex flex-col items-center justify-center p-4 bg-red-50/10 border border-red-500/20 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-4 mb-2">
                    <span className="text-red-500 font-mono font-bold text-lg animate-pulse">
                        {formatTime(recordingDuration)}
                    </span>
                </div>

                {/* Visualizer Wave */}
                <div className="flex items-center justify-center gap-1 h-8 mb-4">
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-1 bg-red-500 rounded-full"
                            animate={{ height: [8, 24, 8] }}
                            transition={{
                                repeat: Infinity,
                                duration: 0.8,
                                ease: "easeInOut",
                                delay: i * 0.1
                            }}
                        />
                    ))}
                </div>

                <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform"
                    onClick={stopRecording}
                >
                    <Square className="h-5 w-5 fill-current" />
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Зогсоох</p>
            </div>
        );
    }

    // State: Review (Recorded)
    if (audioUrl) {
        return (
            <div className="w-full flex items-center gap-3 p-3 rounded-xl border bg-secondary/30 relative overflow-hidden">
                {/* Progress Bar Background (Optional complexity, skipping for simplicity) */}

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={togglePlay}
                    className="h-10 w-10 text-primary bg-primary/10 hover:bg-primary/20 rounded-full shrink-0"
                >
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                </Button>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-primary">Voice Wispr</span>
                        <span className="text-xs font-mono text-muted-foreground">{formatTime(recordingDuration)}</span>
                    </div>
                    {/* Fake waveform or progress bar */}
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-primary"
                            initial={{ width: "0%" }}
                            animate={{ width: isPlaying ? "100%" : "0%" }} // Simple placeholder animation
                            transition={{ duration: recordingDuration, ease: "linear" }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {isUploading ? (
                        <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="hidden sm:inline">Илгээж байна...</span>
                        </div>
                    ) : uploadError ? (
                        <Button type="button" variant="ghost" size="icon" onClick={() => uploadAudio()} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                            <RotateCw className="h-4 w-4" />
                        </Button>
                    ) : (
                        <div className="h-8 w-8 flex items-center justify-center text-green-500">
                            <Send className="h-4 w-4" />
                        </div>
                    )}

                    <Button type="button" variant="ghost" size="icon" onClick={deleteRecording} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

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

    // State: Idle
    if (compact) {
        return (
            <Button
                type="button"
                onClick={startRecording}
                className="h-9 w-9 rounded-xl flex items-center justify-center p-0 transition-all"
                title="Дуут зурвас үлдээх"
                style={{
                    background: 'rgba(139,92,246,0.08)',
                    border: '1.5px solid rgba(139,92,246,0.2)',
                    color: '#8b5cf6',
                }}
            >
                <Mic className="h-4 w-4" />
            </Button>
        );
    }
    // State: Idle (full)
    return (
        <Button
            type="button"
            variant="outline"
            onClick={startRecording}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary group"
        >
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Mic className="h-4 w-4" />
            </div>
            <span className="font-medium">Дуут зурвас үлдээх</span>
        </Button>
    );
}
