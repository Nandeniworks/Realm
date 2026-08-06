import React from 'react';

export default function Input({ 
  label, 
  id, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  className = '', 
  required = false,
  maxLength,
  ...props 
}) {
  return (
    <div className={`flex flex-col space-y-2 w-full text-left ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-realm-lavender/80 pl-1">
          {label}
        </label>
      )}
      <input
        type={type}
        id={id}
        name={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        className="glass-input px-5 py-3.5 rounded-2xl text-realm-moon placeholder-realm-moon-muted/40 w-full text-base focus:ring-1 focus:ring-realm-lavender/30"
        {...props}
      />
    </div>
  );
}
