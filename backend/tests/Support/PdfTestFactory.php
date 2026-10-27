<?php

namespace Tests\Support;

use Illuminate\Http\UploadedFile;

class PdfTestFactory
{
    /**
     * Build valid PDF string with dynamic xref table calculation.
     */
    protected static function assemblePdf(string $stream): string
    {
        $len = strlen($stream);
        $out = "%PDF-1.4\n";
        $offsets = [];

        $offsets[1] = strlen($out);
        $out .= "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";

        $offsets[2] = strlen($out);
        $out .= "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";

        $offsets[3] = strlen($out);
        $out .= "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n";

        $offsets[4] = strlen($out);
        $out .= "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";

        $offsets[5] = strlen($out);
        $out .= "5 0 obj\n<< /Length {$len} >>\nstream\n{$stream}\nendstream\nendobj\n";

        $xrefOffset = strlen($out);
        $out .= "xref\n0 6\n0000000000 65535 f \n";
        for ($i = 1; $i <= 5; $i++) {
            $out .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }
        $out .= "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF";
        return $out;
    }

    /**
     * Create a valid text-containing PDF uploaded file.
     */
    public static function createValidPdf(): UploadedFile
    {
        $textLines = [
            "John Doe",
            "john@example.com",
            "+63 912 345 6789",
            "Manila, Philippines",
            "",
            "SUMMARY",
            "Experienced Full-Stack Developer with 5 years experience.",
            "",
            "SKILLS",
            "PHP, Laravel, TypeScript, React, Next.js, MySQL, Git",
            "",
            "EXPERIENCE",
            "Senior Developer at Tech Corp",
            "2021 - Present",
            "- Developed REST APIs and microservices using Laravel and MySQL.",
            "- Built responsive frontend with React and TypeScript.",
            "",
            "Freelance Web Developer",
            "2019 - 2021",
            "- Freelance client work delivering web portals.",
            "",
            "PROJECTS",
            "Golden Resort Booking System",
            "Built booking engine with Laravel and MySQL.",
            "",
            "EDUCATION",
            "State University",
            "Bachelor of Science in Information Technology",
            "2019",
            "",
            "CERTIFICATIONS",
            "AWS Certified Developer - Amazon Web Services",
            "2022",
        ];

        $stream = "BT /F1 12 Tf 50 750 Td 14 TL\n";
        foreach ($textLines as $line) {
            $escaped = str_replace(['(', ')'], ['\\(', '\\)'], $line);
            $stream .= "({$escaped}) '\n";
        }
        $stream .= "ET";

        $pdf = self::assemblePdf($stream);

        $tempFile = tempnam(sys_get_temp_dir(), 'test_pdf_') . '.pdf';
        file_put_contents($tempFile, $pdf);

        return new UploadedFile($tempFile, 'resume.pdf', 'application/pdf', null, true);
    }

    /**
     * Create an image-only / empty scanned PDF (valid PDF structure but no extractable text).
     */
    public static function createScannedPdf(): UploadedFile
    {
        $stream = "BT /F1 12 Tf 50 750 Td () Tj ET";
        $pdf = self::assemblePdf($stream);

        $tempFile = tempnam(sys_get_temp_dir(), 'test_scanned_') . '.pdf';
        file_put_contents($tempFile, $pdf);

        return new UploadedFile($tempFile, 'scanned_resume.pdf', 'application/pdf', null, true);
    }

    /**
     * Create a fake PDF (text file renamed to .pdf, missing %PDF- header).
     */
    public static function createFakePdf(): UploadedFile
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'fake_pdf_') . '.pdf';
        file_put_contents($tempFile, 'This is a plaintext file renamed to pdf.');

        return new UploadedFile($tempFile, 'fake_resume.pdf', 'application/pdf', null, true);
    }
}
