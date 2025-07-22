import { render, screen, waitFor } from '@testing-library/react';
import UserProfile from './UserProfile';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UserProfile', () => {
  it('loads and displays user profile data', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        primaryAirport: "JFK",
        preferredAirlines: ["Delta", "United", "JetBlue"],
        flightClass: "business",
        preferredHotelBrands: ["Marriott", "Hilton"],
        rentalCarPreference: "Hertz",
        rewardPrograms: ["Delta SkyMiles", "Hilton Honors"]
      }
    });

    render(<UserProfile />);
    await waitFor(() => expect(screen.getByDisplayValue("JFK")).toBeInTheDocument());
    expect(screen.getByDisplayValue("business")).toBeInTheDocument();
  });
}); 