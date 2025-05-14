import { MenuItems, Transition } from "@headlessui/react";
import { PropsWithChildren } from "react";
import { Fragment } from "react/jsx-runtime";

export default function DropdownMenu ({children, expandTop}: PropsWithChildren<{expandTop?: boolean}>) {
    let classes = 'left-0 origin-top-left';

    if (expandTop) {
        classes = 'left-0 bottom-[calc(100%+15px)] origin-bottom-left'
    }

    return (

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className={ 'absolute mt-2 w-48 divide-y divide-gray-100 rounded-md bg-white shadow focus:outline-none z-1 ' + classes }>
            {children}
        </MenuItems>
      </Transition>
    )
}
