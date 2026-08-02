"use client"

import { useFormStatus } from "react-dom"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import type { VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button-variants"

function Button({
  className,
  variant = "default",
  size = "default",
  children,
  disabled,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  // useFormStatus reports the pending state of the nearest ancestor <form>;
  // it's a no-op default ({ pending: false }) outside of one, so this is
  // safe on buttons that aren't form submit buttons too.
  const { pending } = useFormStatus()
  const isPending = props.type === "submit" && pending

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || isPending}
      {...props}
    >
      {isPending && <Loader2Icon className="animate-spin" />}
      {children}
    </ButtonPrimitive>
  )
}

export { Button }
