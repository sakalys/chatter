import { ClientError } from "./api"

export interface ValidationErrors {
    errors?: string[]
    children?: {
        [x: string | number]: ValidationErrors
    } | ValidationErrors[]
}


export interface CleanFields {
    [x: string]: CleanFields | string
}

export const stringifyValidationErrors = (errors: ValidationErrors, cleanFields: CleanFields = {}, out: string[] = [], atPath = ''): string[] => {
    for (const reason of errors.errors || []) {
        out.push(reason);
    }

    if (!errors.children) {
        return out;
    }

    for (const field in errors.children) {
        const child = errors.children[field];

        const path = atPath ? (atPath + '.' + field) : field;

        (child.errors || []).forEach(reason => {
            const cleanField = cleanFields[field] || path;
            out.push(`${cleanField}: ${reason}`)
        });

        if (child.children) {
            const thisCleanFields = typeof cleanFields[field] === 'object'
                ? cleanFields[field] as {}
                : {};

            stringifyValidationErrors(child, thisCleanFields, out, path);
        }
    }

    return out;
}

export const getValidationErrors = (e: Error | null) => {
    if (e instanceof ClientError && e.json.validationErrors) {
        return e.json.validationErrors as ValidationErrors;
    }

    return null;
}
