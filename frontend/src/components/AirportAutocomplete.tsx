import React, { useState, useEffect, useMemo } from 'react';
import { Airport } from '../types/trip';
import apiClient from '../services/apiClient';
import type { AutocompleteRenderOptionState } from '@mui/material/Autocomplete';

// If using MUI, import Autocomplete and TextField
// Otherwise, fallback to basic input+dropdown
let Autocomplete: any, TextField: any;
try {
  // @ts-ignore
  Autocomplete = require('@mui/material/Autocomplete').default;
  // @ts-ignore
  TextField = require('@mui/material/TextField').default;
} catch {
  Autocomplete = null;
  TextField = null;
}

interface AirportAutocompleteProps {
  value: Airport | null;
  onChange: (airport: Airport | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
}

const AirportAutocomplete: React.FC<AirportAutocompleteProps> = ({
  value,
  onChange,
  label = 'Airport',
  placeholder = 'Type city, code, or airport name',
  disabled = false,
  required = false,
  helperText
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimeout = useMemo(() => ({ current: null as any }), []);

  useEffect(() => {
    if (!inputValue || inputValue.length < 2) {
      setOptions([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      apiClient.searchAirports(inputValue)
        .then(res => {
          if (res.success && Array.isArray(res.data)) {
            setOptions(res.data);
            setError(null);
          } else {
            setOptions([]);
            setError(res.error || 'No results');
          }
        })
        .catch(err => {
          setOptions([]);
          setError(err.message || 'Error searching airports');
        })
        .finally(() => setLoading(false));
    }, 350);
    // eslint-disable-next-line
  }, [inputValue]);

  // Helper: get display string for value
  const getDisplayString = (val: Airport | string | null) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return `${val.city} (${val.code}) - ${val.name}`;
  };

  // MUI Autocomplete
  if (Autocomplete && TextField) {
    return (
      <Autocomplete
        options={options}
        getOptionLabel={(option: Airport | string) =>
          typeof option === 'string' ? option : `${option.city} (${option.code}) - ${option.name}`
        }
        value={value}
        freeSolo
        inputValue={inputValue}
        onInputChange={(_event: React.SyntheticEvent, newInputValue: string) => setInputValue(newInputValue)}
        loading={loading}
        disabled={disabled}
        isOptionEqualToValue={(a: Airport, b: Airport) => a.code === b.code}
        onChange={(_event: any, newValue: Airport | string | null) => {
          if (typeof newValue === 'string') {
            onChange({ code: newValue.toUpperCase(), city: '', name: '' } as Airport);
          } else {
            onChange(newValue);
          }
        }}
        renderInput={(params: any) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            required={required}
            helperText={error || helperText}
            error={!!error}
            sx={{
              '& .MuiInputLabel-root': { color: 'white' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'white' },
                '&:hover fieldset': { borderColor: 'white' },
                '&.Mui-focused fieldset': { borderColor: 'white' }
              },
              '& .MuiInputBase-input': { color: 'white' }
            }}
          />
        )}
        renderOption={(
          props: React.HTMLAttributes<HTMLLIElement>,
          option: Airport,
          state: AutocompleteRenderOptionState
        ) => (
          <li {...props} style={{ color: 'white', backgroundColor: '#222' }}>
            {option.city} ({option.code}) - {option.name}
          </li>
        )}
        noOptionsText={loading ? 'Loading...' : 'No airports found'}
      />
    );
  }

  // Fallback: basic input + dropdown
  return (
    <div style={{ position: 'relative', width: 300 }}>
      <label>
        {label}
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={{ width: '100%', padding: 8, marginTop: 4 }}
        />
      </label>
      {helperText && <div style={{ fontSize: 12, color: '#888' }}>{helperText}</div>}
      {loading && <div style={{ fontSize: 12 }}>Loading...</div>}
      {error && <div style={{ color: 'red', fontSize: 12 }}>{error}</div>}
      {options.length > 0 && (
        <ul style={{
          position: 'absolute',
          zIndex: 10,
          background: '#fff',
          border: '1px solid #ccc',
          width: '100%',
          maxHeight: 200,
          overflowY: 'auto',
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}>
          {options.map(opt => (
            <li
              key={opt.code}
              style={{ padding: 8, cursor: 'pointer' }}
              onClick={() => {
                onChange(opt);
                setInputValue(`${opt.city} (${opt.code}) - ${opt.name}`);
                setOptions([]);
              }}
            >
              {opt.city} ({opt.code}) - {opt.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AirportAutocomplete; 