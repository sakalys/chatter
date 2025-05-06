import { createContext, PropsWithChildren, ReactElement, useContext } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { classNames } from "../../util/ui";

type ModalProps = {
    open: boolean
    position?: "center" | "top" | "bottom"
    onClose: () => void
    closeOnOverlayClick?: boolean
    height?: 'auto' /* allows the visible children e.g. the modal box to be larger than the visible area */
    | 'fixed-full' /* prevents the inner children to scale more than the visible area */
};
export const Modal = (props: PropsWithChildren<ModalProps>) => {
    const { open, onClose, position = 'top', closeOnOverlayClick = true } = props;

    let additionalClasses = '';
    if (position === 'top') {
        additionalClasses += ' items-start'
    } else if (position === 'center') {
        additionalClasses += ' items-center'
    } else if (position === 'bottom') {
        additionalClasses += ' items-end'
    }

    if (!props.height || props.height === 'auto') {
        additionalClasses += ' min-h-full';
    } else if (props.height === 'fixed-full') {
        additionalClasses += ' h-full';
    }

    return (
        <ModalContext.Provider value={props}>
            <Dialog 
                transition
                className="relative z-30 transition duration-100 ease-out data-[closed]:opacity-0 data-[closed]:pointer-events-none"
                open={open} 
                onClose={onClose}
            >
                {/* Overlay - just background. The click overlay to close feature is handled by Dialog.Panel */}
                <div className="fixed inset-0 bg-zinc-950/35" aria-hidden="true"></div>

                {/* Full-screen scrollable container */}
                <div className="fixed inset-0 w-screen overflow-y-scroll">
                    {/* Container to center the panel */}
                    <div className={"flex justify-center p-0 sm:p-4" + additionalClasses}>
                        <InnerWrapper closeOnOverlayClick={Boolean(closeOnOverlayClick)}>
                            {props.children}
                        </InnerWrapper>
                    </div>
                </div>
            </Dialog>
        </ModalContext.Provider>
    )
};

const InnerWrapper = ({ children, closeOnOverlayClick }: PropsWithChildren<{ closeOnOverlayClick: boolean }>) => {
    if (closeOnOverlayClick) {
        return <DialogPanel className="contents">{children}</DialogPanel>
    }
    return <div className="contents">{children}</div>;
}

export const ModalContext = createContext<Omit<ModalProps, 'open'>>(null!);

export const useModal = () => useContext(ModalContext);

export const ModalBox = (
    {
        title,
        width = 'full',
        minHeight,
        children,
        height,
        theme = 'light',
        addons,
    }: PropsWithChildren<{
        theme?: 'light' | 'black'
        title: string
        width?: 'full' | 'sm' | 'md' | 'lg'
        minHeight?: string
        height?: 'auto' | 'fixed-full'
        addons?: ReactElement
    }>) => {

    const modalProps = useContext(ModalContext);

    let additionalClasses = '';

    if (width === 'sm') {
        additionalClasses += ' md:max-w-xl ';
    }

    if (width === 'md') {
        additionalClasses += ' md:max-w-3xl ';
    }

    if (width === 'lg') {
        additionalClasses += ' md:max-w-7xl ';
    }

    if (minHeight) {
        additionalClasses += ' ' + minHeight;
    }

    if (height === 'fixed-full') {
        // additionalClasses += ' h-full overflow-y-scroll';
        additionalClasses += ' h-full overflow-hidden';
        if (width === 'sm') {
            additionalClasses += ' md:max-h-[800px]';
        }

        if (width === 'md') {
            additionalClasses += ' md:max-h-[1200px]';
        }
    }

    additionalClasses += theme === 'light' ? ' bg-white' : ' bg-black';
    const headerClasses = theme === 'light' ? ' ' : ' border-b-0';
    const titleClasses = theme === 'light' ? ' ' : ' text-white';

    return (
        <div className={"flex-grow sm:rounded-lg max-w-full shadow min-w-0 " + additionalClasses}>
            <div className="relative h-full flex flex-col">
                {/*Modal header*/}
                <div className={'flex items-center justify-between p-4 md:p-5 border-b rounded-t space-x-8' + headerClasses}>
                    <DialogTitle as="h3" className={'text-xl font-semibold min-w-0 text-gray-900 truncate' + titleClasses}>{title}</DialogTitle>
                    <div className="flex flex-row space-x-8">
                        {addons}
                        <button
                            onClick={modalProps.onClose}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
                            data-modal-hide="default-modal">
                            <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
                                viewBox="0 0 14 14">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                    strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                        </button>
                    </div>
                </div>
                {children}
            </div>
        </div>
    )
}

export const ModalBody = ({ children, className, noPadding }: PropsWithChildren<{ className?: string, noPadding?: boolean }>) => {
    return (
        <div className={classNames("flex-grow min-h-0 overflow-y-auto relative bg-zinc-50", !noPadding && 'p-4 md:p-5', className)}>
            {children}
        </div>
    )
}

export const ModalFooter = ({ children, className }: PropsWithChildren<{ className?: string }>) => {
    return (
        <footer
            className={classNames("p-4 border-t border-gray-200 rounded-b", className)}>
            {children}
        </footer>
    )
}
