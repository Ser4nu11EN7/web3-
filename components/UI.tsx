import React from 'react';

// --- Card Component ---
interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, title, className = "", action }) => {
  return (
    <div className={`bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-2xl p-6 flex flex-col h-full transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-4">
          {title && <h3 className="text-sm font-semibold text-gray-900 tracking-tight uppercase opacity-80">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};

// --- Button Component ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = "", 
  disabled,
  ...props 
}) => {
  const baseStyles = "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-apple-blue text-white shadow-md shadow-blue-500/20 hover:bg-blue-600",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200/50",
    danger: "bg-apple-red text-white shadow-md shadow-red-500/20 hover:bg-red-600",
    success: "bg-apple-green text-white shadow-md shadow-green-500/20 hover:bg-green-600",
    ghost: "bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
      ) : children}
    </button>
  );
};

// --- Input Component ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = "", ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-medium text-gray-500 ml-1">{label}</label>}
      <input 
        className={`w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-apple-blue/50 focus:border-apple-blue transition-all duration-200 ${className}`}
        {...props}
      />
    </div>
  );
};

// --- Status Badge ---
export const Badge: React.FC<{ status: 'active' | 'inactive' | 'danger' | 'warning', text: string }> = ({ status, text }) => {
  const colors = {
    active: "bg-green-100 text-green-700 border-green-200",
    inactive: "bg-gray-100 text-gray-600 border-gray-200",
    danger: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-orange-100 text-orange-700 border-orange-200"
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[status]}`}>
      {text}
    </span>
  );
};