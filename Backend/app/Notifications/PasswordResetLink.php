<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Password;
use LogicException;
use SensitiveParameter;

class PasswordResetLink extends ResetPassword implements ShouldQueue, ShouldBeEncrypted
{
    use Queueable;

    public $tries = 3;
    public $timeout = 30;
    public $backoff = [10, 30];

    public function __construct(#[SensitiveParameter] $token)
    {
        parent::__construct($token);

        $this->onConnection(config('auth.password_reset_queue_connection'))
            ->onQueue('password-resets')
            ->afterCommit();
    }

    public function shouldSend($notifiable, string $channel): bool
    {
        // A delayed or retried email must not deliver a consumed or replaced link.
        return $notifiable->is_active
            && Password::broker()->tokenExists($notifiable, $this->token);
    }

    public function toMail($notifiable): MailMessage
    {
        $minutes = config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

        return (new MailMessage)
            ->subject('Reset your Tether password')
            ->line('We received a request to reset your Tether password.')
            ->action('Reset password', $this->resetUrl($notifiable))
            ->line("This single-use link expires in {$minutes} minutes.")
            ->line('If you did not request a password reset, you can ignore this email.');
    }

    protected function resetUrl($notifiable): string
    {
        $base = rtrim((string) config('app.frontend_url'), '/');
        $parts = parse_url($base);

        if (! $parts || ! in_array($parts['scheme'] ?? '', ['https', 'http'], true)
            || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])
            || isset($parts['query']) || isset($parts['fragment'])) {
            throw new LogicException('FRONTEND_URL must be a trusted HTTP(S) application URL.');
        }

        // A fragment keeps reset credentials out of frontend HTTP access logs.
        return $base.'/reset-password#'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], '', '&', PHP_QUERY_RFC3986);
    }
}
