import { MenuItems, Transition } from "@headlessui/react";
import { PropsWithChildren } from "react";
import { Fragment } from "react/jsx-runtime";

export default function DropdownMenu ({children}: PropsWithChildren) {
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
        <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow shadow focus:outline-none z-1">
            {children}
        </MenuItems>
      </Transition>
    )
}