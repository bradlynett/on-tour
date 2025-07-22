import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AirportAutocomplete from '../../components/AirportAutocomplete';
import { Airport } from '../../types/trip';

jest.mock('../../services/apiClient', () => ({
  __esModule: true,
  default: {
    searchAirports: jest.fn()
  }
}));

const apiClient = require('../../services/apiClient').default;

describe('AirportAutocomplete', () => {
  const airports: Airport[] = [
    { id: 1, city: 'New York', code: 'JFK', name: 'John F. Kennedy International Airport', country: 'United States', state: 'NY', latitude: 40.6413, longitude: -73.7781, searchProvider: 'local' },
    { id: 2, city: 'Los Angeles', code: 'LAX', name: 'Los Angeles International Airport', country: 'United States', state: 'CA', latitude: 33.9416, longitude: -118.4085, searchProvider: 'local' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders input and label', () => {
    render(<AirportAutocomplete value={null} onChange={() => {}} label="Airport" />);
    expect(screen.getByLabelText(/Airport/i)).toBeInTheDocument();
  });

  it('debounces input and displays airport options', async () => {
    apiClient.searchAirports.mockResolvedValue({ success: true, data: airports });
    render(<AirportAutocomplete value={null} onChange={() => {}} label="Airport" />);
    const input = screen.getByLabelText(/Airport/i);
    fireEvent.change(input, { target: { value: 'New' } });
    await waitFor(() => expect(apiClient.searchAirports).toHaveBeenCalledWith('New'), { timeout: 1000 });
    await waitFor(() => expect(screen.getByText(/John F. Kennedy International Airport/)).toBeInTheDocument());
  });

  it('calls onChange when an airport is selected', async () => {
    apiClient.searchAirports.mockResolvedValue({ success: true, data: airports });
    const handleChange = jest.fn();
    render(<AirportAutocomplete value={null} onChange={handleChange} label="Airport" />);
    const input = screen.getByLabelText(/Airport/i);
    fireEvent.change(input, { target: { value: 'Los' } });
    await waitFor(() => expect(screen.getByText(/Los Angeles International Airport/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Los Angeles International Airport/));
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({ code: 'LAX' }));
  });

  it('shows loading and error states', async () => {
    apiClient.searchAirports.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<AirportAutocomplete value={null} onChange={() => {}} label="Airport" />);
    const input = screen.getByLabelText(/Airport/i);
    fireEvent.change(input, { target: { value: 'Chi' } });
    expect(await screen.findByText(/Loading.../i)).toBeInTheDocument();

    apiClient.searchAirports.mockRejectedValue(new Error('API error'));
    fireEvent.change(input, { target: { value: 'Error' } });
    await waitFor(() => expect(screen.getByText(/Error searching airports/i)).toBeInTheDocument());
  });
}); 