<?php

namespace App\Services;

use App\Exceptions\EncryptedPdfException;
use App\Exceptions\ScannedPdfException;
use Exception;
use InvalidArgumentException;
use Smalot\PdfParser\Parser;

class PdfParserService
{
    protected Parser $parser;

    public const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes

    public function __construct(?Parser $parser = null)
    {
        $this->parser = $parser ?? new Parser();
    }

    /**
     * Validate and extract plain text from a PDF file path.
     *
     * @throws InvalidArgumentException
     * @throws EncryptedPdfException
     * @throws ScannedPdfException
     */
    public function extractText(string $filePath): string
    {
        if (!file_exists($filePath) || !is_readable($filePath)) {
            throw new InvalidArgumentException('The specified PDF file cannot be found or read.');
        }

        $fileSize = filesize($filePath);
        if ($fileSize === 0) {
            throw new InvalidArgumentException('The uploaded file is empty (0 bytes).');
        }

        if ($fileSize > self::MAX_FILE_SIZE) {
            throw new InvalidArgumentException('The PDF file size exceeds the allowed 5 MB limit.');
        }

        // Verify PDF Magic Bytes (%PDF-)
        $handle = fopen($filePath, 'rb');
        $header = fread($handle, 5);
        fclose($handle);

        if ($header !== '%PDF-') {
            throw new InvalidArgumentException('The file is not a valid PDF document (missing PDF signature).');
        }

        try {
            $pdf = $this->parser->parseFile($filePath);
            $rawText = $pdf->getText();
        } catch (Exception $e) {
            $message = strtolower($e->getMessage());
            if (str_contains($message, 'password') || str_contains($message, 'encrypt') || str_contains($message, 'security')) {
                throw new EncryptedPdfException('The uploaded PDF is encrypted or password-protected and cannot be parsed.');
            }
            throw new InvalidArgumentException('Failed to parse PDF document: ' . $e->getMessage());
        }

        $normalized = $this->normalizeText($rawText);

        // Check if usable text was extracted
        if (mb_strlen(trim($normalized)) < 20) {
            throw new ScannedPdfException(
                'The uploaded PDF appears to be scanned or contains only images. OCR is required and is not currently supported.'
            );
        }

        return $normalized;
    }

    /**
     * Normalize whitespace, line breaks, and formatting characters without destroying structure.
     */
    public function normalizeText(string $text): string
    {
        // Convert non-standard carriage returns
        $text = str_replace(["\r\n", "\r"], "\n", $text);

        // Replace tab stops with uniform spacing
        $text = str_replace("\t", '    ', $text);

        // Clean unprintable non-ASCII control characters except newline and space
        $text = preg_replace('/[^\PC\s]/u', '', $text);

        // Normalize bullet symbols to standard dash
        $text = preg_replace('/[•●◆▪■*]\s*/u', "\n- ", $text);

        // Normalize multiple blank lines to a maximum of two newlines
        $text = preg_replace("/\n{3,}/", "\n\n", $text);

        // Trim each line's trailing whitespace
        $lines = explode("\n", $text);
        $trimmedLines = array_map('rtrim', $lines);

        return trim(implode("\n", $trimmedLines));
    }
}
