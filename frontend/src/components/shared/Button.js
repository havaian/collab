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
    ...props
}) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg transform hover:scale-[1.02] focus:ring-blue-500',
        secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm hover:shadow-md focus:ring-blue-500',
        ghost: 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:ring-blue-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg focus:ring-red-500',
        success: 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg focus:ring-green-500',
        outline: 'border-2 border-blue-500 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
        dark: 'bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg focus:ring-gray-500'
    };

    const sizes = {
        xs: 'px-2 py-1 text-xs rounded',
        sm: 'px-3 py-1.5 text-sm rounded-md',
        md: 'px-4 py-2 text-sm rounded-lg',
        lg: 'px-6 py-3 text-base rounded-lg',
        xl: 'px-8 py-4 text-lg rounded-xl'
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
            {children}
        </button>
    );
};

export default Button;