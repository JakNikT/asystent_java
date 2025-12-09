import * as React from "react"
import { createPortal } from "react-dom"
import { Button } from "./Button"
import { cn } from "../../lib/utils"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

function Modal({ isOpen, onClose, title, description, children, footer, className }: ModalProps) {
  if (!isOpen) return null

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [onClose])

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
      <div 
        className={cn(
          "relative w-full rounded-[20px] border border-white/10 bg-brand-dark/50 backdrop-blur-sm p-6 shadow-xl shadow-black/30 animate-slide-up",
          // Domyślne wartości tylko jeśli nie przekazano własnego className
          !className && "max-w-lg sm:max-w-xl",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
          {title && <h2 className="text-lg font-semibold leading-none tracking-tight text-white">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground text-white/70">{description}</p>}
        </div>
        
        <div className="my-4">
          {children}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6">
          {footer ? footer : (
            <Button variant="outline" onClick={onClose}>
              Zamknij
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export { Modal }

