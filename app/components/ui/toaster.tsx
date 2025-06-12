import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '~/components/ui/toast';
import { useToast } from '~/hooks/use-toast';

const DEFAULT_TOAST_DURATION = 10000;

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider swipeDirection="up">
      {toasts.map(
        ({
          id,
          title,
          description,
          action,
          duration = DEFAULT_TOAST_DURATION,
          ...props
        }) => (
          <Toast key={id} duration={duration} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        ),
      )}
      <ToastViewport />
    </ToastProvider>
  );
}
