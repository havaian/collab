// src/components/shared/AnimatedLogo.js
import React from 'react';

const AnimatedLogo = ({
    size = 'medium',
    showTitle = true,
    onClick = null,
    className = '',
    variant = 'horizontal' // horizontal, vertical, icon-only
}) => {
    // Size configurations
    const sizeConfig = {
        small: {
            img: 'h-12 w-12',
            svg: 'h-6 w-6',
            text: 'text-lg',
            spacing: 'space-x-2'
        },
        medium: {
            img: 'h-8 w-8',
            svg: 'h-8 w-8',
            text: 'text-xl',
            spacing: 'space-x-2'
        },
        large: {
            img: 'h-24 w-24',
            svg: 'h-12 w-12',
            text: 'text-3xl',
            spacing: 'space-x-3'
        },
        xlarge: {
            img: 'h-32 w-32',
            svg: 'h-16 w-16',
            text: 'text-4xl',
            spacing: 'space-x-4'
        }
    };

    const config = sizeConfig[size];
    const isClickable = typeof onClick === 'function';

    // Define the SVG as a component for better animation control
    const LogoSVG = ({ className: svgClassName }) => (
        // <svg
        //     xmlns="http://www.w3.org/2000/svg"
        //     fill="none"
        //     viewBox="0 0 24 24"
        //     strokeWidth="1.5"
        //     className={`${config.svg} ${svgClassName} transition-all duration-300 ease-in-out logo-svg`}
        // >
        //     <path
        //         strokeLinecap="round"
        //         strokeLinejoin="round"
        //         d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
        //         className="transition-all duration-500 ease-in-out logo-path"
        //     />
        // </svg>
        <img
            src="/logo.png"
            alt="GPT-Collab Logo"
            className={`${config.img} ${svgClassName} transition-all duration-300 ease-in-out logo-image object-contain`}
        />
    );

    const renderContent = () => {
        const textElement = showTitle && (
            <span className={`
                ${config.text} 
                font-bold 
                bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent
                transition-all duration-500 ease-in-out
                logo-text
            `}>
                GPT-Collab
            </span>
        );

        if (variant === 'icon-only') {
            return (
                <LogoSVG className="stroke-blue-600 logo-icon-only" />
            );
        }

        if (variant === 'vertical') {
            return (
                <div className="flex flex-col items-center space-y-2">
                    <LogoSVG className="stroke-blue-600 logo-icon" />
                    {textElement}
                </div>
            );
        }

        // Default horizontal layout
        return (
            <div className={`flex items-center ${config.spacing}`}>
                <LogoSVG className="stroke-blue-600 logo-icon" />
                {textElement}
            </div>
        );
    };

    const containerProps = {
        className: `
      animated-logo-container
      group
      ${isClickable ? 'cursor-pointer' : ''}
      transition-all duration-300 ease-in-out
      ${className}
    `,
        ...(isClickable && { onClick })
    };

    const Container = isClickable ? 'button' : 'div';

    return (
        <Container {...containerProps}>
            {renderContent()}
        </Container>
    );
};

export default AnimatedLogo;