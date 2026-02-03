import { Header } from '@/components/Header';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function HelpPage() {
    return (
        <>
            <Header title="Тусламж" />
             <div className="container mx-auto max-w-2xl p-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Түгээмэл асуултууд</h1>
                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>Wispr гэж ямар апп вэ?</AccordionTrigger>
                        <AccordionContent>
                        Wispr нь хүмүүст нэргүйгээр wispr илгээх, мөн өөрийн сэтгэлийн үгээ бусадтай хуваалцах боломжийг олгодог аюулгүй, эерэг орон зай юм.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>Миний мэдээлэл нууцлалтай байж чадах уу?</AccordionTrigger>
                        <AccordionContent>
                        Тийм. Таны илгээсэн wispr болон сэтгэлийн үгс бүрэн нэргүй байдаг. Хэрэв та өөрийн үгсээ хадгалахыг хүсвэл Google бүртгэлээр нэвтэрч болох бөгөөд таны имэйл хаяг болон бусад мэдээллийг бид чандлан нууцална.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger>Hint яаж ажилладаг вэ?</AccordionTrigger>
                        <AccordionContent>
                        Хэрэв танд wispr илгээсэн хүн нэмэлт мэдээлэл (танил, найз гэх мэт) оруулсан бол, та "Hint-ийн эрх"-ээ ашиглан илгээгчийн талаарх жижиг Hint авах боломжтой. Энэ нь хэнийг ч илчлэхгүй, зөвхөн тааварт зориулагдсан.
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-4">
                        <AccordionTrigger>Зохисгүй контент харвал яах вэ?</AccordionTrigger>
                        <AccordionContent>
                        "Сэтгэлийн үгс" хэсэгт байрлах пост бүрийн хажууд далбааны дүрс бүхий товч бий. Та тэр товч дээр дарж зохисгүй контентыг мэдээлэх боломжтой. Манай систем шалгаж, шаардлагатай арга хэмжээг авах болно.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
             </div>
        </>
    );
}
