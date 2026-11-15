<?php

namespace App\Exceptions;

use RuntimeException;

class EditorialSuggestionException extends RuntimeException
{
    public function __construct(string $message, public readonly string $errorCode, public readonly int $status = 502)
    {
        parent::__construct($message);
    }
}
