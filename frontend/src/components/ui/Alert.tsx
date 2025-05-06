import {PropsWithChildren} from "react";
import {Variant} from "./types";

export const AlertBox  = ({children, variant = Variant.Default, className}: PropsWithChildren<{
    variant?: Variant
    className?: string
}>) => {
    let variantClasses;
    if (variant === Variant.Danger) {
        variantClasses = 'bg-red-700 text-gray-200 border-red-900';
    } else if (variant === Variant.Success) {
        variantClasses = 'bg-green-100 text-green-700 border-green-400'
    } else if (variant === Variant.Warning) {
        variantClasses = 'bg-orange-100 text-orange-700 border-amber-400'
    } else if (variant === Variant.Info) {
        variantClasses = 'bg-blue-100 text-blue-600 border-blue-300'
    } else {
        variantClasses = 'bg-zinc-100';
    }

    if (className) {
        variantClasses += ' ' + className;
    }

    return <div className={'p-4 border-l-4 text-sm w-full ' + variantClasses}>
        {children}
    </div>
}
