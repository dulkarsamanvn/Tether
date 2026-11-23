<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Throwable;

class PasswordResetController extends Controller
{
    public function requestLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        try {
            DB::transaction(function () use ($validated) {
                // Serialize link replacement and password reset for the same account.
                User::where('email', $validated['email'])->lockForUpdate()->first();
                Password::broker()->sendResetLink($validated + ['is_active' => true]);
            });
        } catch (Throwable $exception) {
            // Do not expose account existence or reset credentials in errors or logs.
            Log::error('Password reset email could not be queued.', [
                'exception_type' => $exception::class,
            ]);
        }

        // Unknown, inactive and recently requested accounts receive the same answer.
        return response()->json([
            'message' => 'If an eligible account exists, we will email a password reset link.',
            'resend_after' => 60,
        ], 202);
    }

    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'token' => ['required', 'string', 'regex:/\A[a-f0-9]{64}\z/'],
            'password' => ['bail', 'required', 'string', 'min:8', 'confirmed', function ($attribute, $value, $fail) {
                // Bcrypt accepts at most 72 bytes, including multi-byte characters.
                if (strlen($value) > 72) {
                    $fail('The password must not exceed 72 bytes. Choose a shorter password.');
                }
            }],
        ]);

        $resetUser = null;
        $status = DB::transaction(function () use ($validated, &$resetUser) {
            User::where('email', $validated['email'])->lockForUpdate()->first();

            return Password::broker()->reset($validated + ['is_active' => true], function (User $user, string $password) use (&$resetUser) {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                $user->tokens()->delete();
                DB::table('sessions')->where('user_id', $user->id)->delete();
                $resetUser = $user;
            });
        });

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'code' => 'password_reset_invalid',
                'message' => 'This reset link is invalid or has expired. Request a new one.',
            ], 422);
        }

        event(new PasswordReset($resetUser));

        return response()->json([
            'message' => 'Your password has been reset. Sign in with your new password.',
        ]);
    }
}
