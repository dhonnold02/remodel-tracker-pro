import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CommonProps = {
  /** External ("source of truth") value — usually a prop tied to a remote/parent store. */
  value: string;
  /** Called debounced (default 400ms) once typing pauses. */
  onDebouncedChange: (value: string) => void;
  /** Called immediately on every keystroke if the caller wants to mirror local state. */
  onLocalChange?: (value: string) => void;
  delay?: number;
};

/**
 * Internal hook — keeps a fast local string while typing and debounces
 * the parent/database write. Resyncs from `value` only when the input is
 * NOT focused (so remote echoes from realtime don't clobber what the user
 * is typing).
 */
function useDebouncedString(
  value: string,
  onDebouncedChange: (v: string) => void,
  delay: number,
  inputRef: React.RefObject<HTMLElement>,
) {
  const [local, setLocal] = React.useState(value);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitted = React.useRef(value);
  const cbRef = React.useRef(onDebouncedChange);
  cbRef.current = onDebouncedChange;

  // Sync from parent only when not actively focused.
  React.useEffect(() => {
    const el = inputRef.current;
    const isFocused = el && document.activeElement === el;
    if (!isFocused && value !== local) {
      setLocal(value);
      lastEmitted.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Flush pending change on unmount or blur.
  React.useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        if (lastEmitted.current !== local) {
          cbRef.current(local);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setValue = (next: string) => {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (next !== lastEmitted.current) {
        lastEmitted.current = next;
        cbRef.current(next);
      }
    }, delay);
  };

  const flushNow = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (local !== lastEmitted.current) {
      lastEmitted.current = local;
      cbRef.current(local);
    }
  };

  return { local, setValue, flushNow };
}

type InputProps = CommonProps &
  Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "defaultValue">;

export const DebouncedInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ value, onDebouncedChange, onLocalChange, delay = 400, onBlur, ...rest }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);
    const { local, setValue, flushNow } = useDebouncedString(
      value,
      onDebouncedChange,
      delay,
      innerRef,
    );
    return (
      <Input
        ref={innerRef}
        value={local}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          onLocalChange?.(v);
        }}
        onBlur={(e) => {
          flushNow();
          onBlur?.(e);
        }}
        {...rest}
      />
    );
  },
);
DebouncedInput.displayName = "DebouncedInput";

type TextareaProps = CommonProps &
  Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange" | "defaultValue">;

export const DebouncedTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ value, onDebouncedChange, onLocalChange, delay = 400, onBlur, ...rest }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);
    const { local, setValue, flushNow } = useDebouncedString(
      value,
      onDebouncedChange,
      delay,
      innerRef,
    );
    return (
      <Textarea
        ref={innerRef}
        value={local}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          onLocalChange?.(v);
        }}
        onBlur={(e) => {
          flushNow();
          onBlur?.(e);
        }}
        {...rest}
      />
    );
  },
);
DebouncedTextarea.displayName = "DebouncedTextarea";

/* ───── Number input that stores raw number, displays grouped on blur ───── */

type NumberProps = {
  value: number;
  onDebouncedChange: (n: number) => void;
  delay?: number;
  /** When true, shows "12,345" while not focused; raw "12345" while focused. */
  formatOnBlur?: boolean;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "defaultValue" | "type">;

export const DebouncedNumberInput = React.forwardRef<HTMLInputElement, NumberProps>(
  (
    {
      value,
      onDebouncedChange,
      delay = 400,
      formatOnBlur = true,
      onBlur,
      onFocus,
      inputMode = "numeric",
      ...rest
    },
    ref,
  ) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    const [focused, setFocused] = React.useState(false);
    const formatted = formatOnBlur && value ? value.toLocaleString() : value ? String(value) : "";
    const [local, setLocal] = React.useState<string>(formatted);
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastEmitted = React.useRef<number>(value);
    const cbRef = React.useRef(onDebouncedChange);
    cbRef.current = onDebouncedChange;

    // Sync from parent when not focused.
    React.useEffect(() => {
      const el = innerRef.current;
      const isFocused = el && document.activeElement === el;
      if (!isFocused) {
        const next = formatOnBlur && value ? value.toLocaleString() : value ? String(value) : "";
        setLocal(next);
        lastEmitted.current = value;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    React.useEffect(() => {
      return () => {
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
          const n = parseRaw(local);
          if (n !== lastEmitted.current) cbRef.current(n);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const parseRaw = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow only digits + decimal while typing — no thousands separators
      // mid-typing (caret jumps are exactly the bug we want to avoid).
      const cleaned = e.target.value.replace(/[^0-9.]/g, "");
      setLocal(cleaned);
      const n = parseRaw(cleaned);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        if (n !== lastEmitted.current) {
          lastEmitted.current = n;
          cbRef.current(n);
        }
      }, delay);
    };

    return (
      <Input
        ref={innerRef}
        inputMode={inputMode}
        value={local}
        onFocus={(e) => {
          setFocused(true);
          // Switch to raw number while editing
          setLocal(value ? String(value) : "");
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
          }
          const n = parseRaw(local);
          if (n !== lastEmitted.current) {
            lastEmitted.current = n;
            cbRef.current(n);
          }
          if (formatOnBlur) setLocal(n ? n.toLocaleString() : "");
          onBlur?.(e);
        }}
        onChange={handleChange}
        {...rest}
      />
    );
  },
);
DebouncedNumberInput.displayName = "DebouncedNumberInput";
