import React from 'react';
import 'react-phone-number-input/style.css';

export default function LimitedPhoneInput({ value, onChange, className, placeholder }) {
  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // Remove tudo exceto números e o caractere +
    newValue = newValue.replace(/[^\d+]/g, '');
    
    // Limita a 25 caracteres
    if (newValue.length > 25) {
      newValue = newValue.slice(0, 25);
    }
    
    // Se não começar com +, adiciona +55
    if (!newValue.startsWith('+')) {
      newValue = '+55' + newValue;
    }
    
    // Atualiza o valor
    onChange(newValue);
  };

  return (
    <input
      type="tel"
      value={value || ''}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
      style={{
        padding: '8px',
        fontSize: '16px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    />
  );
} 