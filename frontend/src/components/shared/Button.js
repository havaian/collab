// frontend/src/components/shared/Button.js
import React from 'react';
import { classnames } from '../../utils/general';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    className = '',
    // New props for avatar support
    avatar = null,
    avatarAlt = '',
    avatarSize = 'sm',
    ...props
}) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

    // Updated variants to match input/dropdown styling from your code editor
    const variants = {
        // Primary variant matching the input/dropdown style
        primary: 'bg-white text-black border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0)] hover:shadow-none hover:border-black',

        // Alternative variants keeping the same styling pattern
        secondary: 'bg-gray-100 text-black border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0)] hover:shadow-none hover:border-black',
        ghost: 'bg-transparent text-black border-2 border-transparent hover:border-black hover:shadow-[5px_5px_0px_0px_rgba(0,0,0)] hover:bg-gray-50',
        danger: 'bg-red-50 text-red-600 border-2 border-red-500 shadow-[5px_5px_0px_0px_rgba(239,68,68)] hover:shadow-none hover:border-red-500',
        success: 'bg-green-50 text-green-600 border-2 border-green-500 shadow-[5px_5px_0px_0px_rgba(34,197,94)] hover:shadow-none hover:border-green-500',
        outline: 'bg-white text-blue-600 border-2 border-blue-500 shadow-[5px_5px_0px_0px_rgba(59,130,246)] hover:shadow-none hover:border-blue-500',
        dark: 'bg-gray-900 text-white border-2 border-gray-900 shadow-[5px_5px_0px_0px_rgba(17,24,39)] hover:shadow-none hover:border-gray-700',
        // Profile variant for user info buttons
        profile: 'bg-white text-gray-700 border-2 border-gray-200 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none hover:border-gray-300 hover:bg-gray-50'
    };

    const sizes = {
        xs: 'px-2 py-1 text-xs rounded',
        sm: 'px-3 py-1.5 text-sm rounded',
        md: 'px-4 py-2 text-sm rounded-md',
        lg: 'px-6 py-3 text-base rounded-md',
        xl: 'px-8 py-4 text-lg rounded-lg'
    };

    // Avatar size mapping
    const avatarSizes = {
        xs: 'h-4 w-4',
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
        lg: 'h-10 w-10',
        xl: 'h-12 w-12'
    };

    const buttonClasses = classnames(
        baseClasses,
        variants[variant],
        sizes[size],
        className
    );

    return (
        <button
            type={type}
            className={buttonClasses}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            )}

            {/* Avatar rendering */}
            {avatar && !loading && (
                <img
                    className={`${avatarSizes[avatarSize]} rounded-full border border-gray-200 mr-2 flex-shrink-0`}
                    src={avatar}
                    alt={avatarAlt}
                    onError={(e) => {
                        e.target.src = '/default-avatar.png';
                    }}
                />
            )}

            {children}
        </button>
    );
};

export default Button;