"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

// A password field with a show/hide button inside its right edge. It starts
// hidden on every mount, so give it a new `key` to hide it again (a new
// dialog opening, a login attempt) and it isn't left showing on a shared phone.
export function PasswordInput({
  className = "",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={shown ? "text" : "password"}
        // no autocorrect/capitals on a password shown as plain text
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        // keep the cursor in the field when tapping the eye
        onMouseDown={(e) => e.preventDefault()}
        aria-label={shown ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-100"
      >
        {shown ? (
          <EyeOff aria-hidden className="size-5" />
        ) : (
          <Eye aria-hidden className="size-5" />
        )}
      </button>
    </div>
  );
}
