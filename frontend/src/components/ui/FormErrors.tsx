import { ClientError, FetchError, HttpError, ServerError } from "../../util/api";
import { CleanFields, getValidationErrors, stringifyValidationErrors } from "../../util/validation";
import { AlertBox } from "./Alert";
import { Variant } from "./types";
import { ReactElement } from "react";

interface FormErrorsProps {
    error: string | Error | null,
    cleanFields?: CleanFields
    showMessageOfStatusCodes?: number[]
    skipForCodes?: number[]
    messagePrefix?: string
    variant?: Variant
    className?: string
}

export const FormErrors = ({
    error,
    cleanFields = {},
    showMessageOfStatusCodes = [400],
    skipForCodes,
    messagePrefix = '',
    variant: specificVariant,
    className,
}: FormErrorsProps) => {

    if (!error) {
        return null;
    }

    if (skipForCodes?.length && error instanceof HttpError && skipForCodes.includes(error.response.status)) {
        return null;
    }

    const [errorVariant, content] = getAlertContent(error, cleanFields, messagePrefix, showMessageOfStatusCodes);

    const variant = specificVariant || errorVariant;

    return <AlertBox variant={variant} className={className}>
        {content}
    </AlertBox>
}

export const getAlertContent = (error: string | Error, cleanFields: CleanFields, messagePrefix: string, showMessageOfStatusCodes: number[]): [Variant, ReactElement] => {
    if (typeof error === 'string') {
        return [Variant.Danger, <>{error}</>];
    }


    if (error instanceof FetchError) {
        return [Variant.Danger, <>Failed contacting the server. The issue is most likely on our end, sorry.</>];
    } 


    if (!(error instanceof HttpError)) {
        return [Variant.Danger, <>Error: Server responded with an error</>];
    }

    if (error instanceof ClientError) {
        const validationErrors = getValidationErrors(error);
        if (validationErrors) {
            return [ Variant.Warning, <>Please fix the following errors:
                <ul>
                    {stringifyValidationErrors(validationErrors, cleanFields).map((error, i) => (
                        <li key={i} className="list-disc list-inside leading-snug">{error}</li>
                    ))}
                </ul>
            </>];
        }
    }

    if (showMessageOfStatusCodes?.includes(error.response.status)) {
        return [Variant.Warning, <>{messagePrefix + (error.json.detail || error.message)}</>];
    }

    if (error instanceof ServerError) {
        return [Variant.Danger, <>{messagePrefix}Server error, please contact support</>];
    }

    return [Variant.Danger, <>Error: Server responded with error (code {error.response.status})</>];
}

interface OnlyForResponseCodesProps {
    error: Error | null,
    codes: number[]
    render: (error: HttpError) => ReactElement | null
}

export const OnlyForResponseCodes = ({
    error,
    codes,
    render,
}: OnlyForResponseCodesProps) => {
    const match = error instanceof HttpError && codes.includes(error.response.status);

    if (!match) {
        return null;
    }

    return render(error);
}

