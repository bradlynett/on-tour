function getTicketmasterEventUrl(eventId, eventName, city, date) {
  if (eventId) return `https://www.ticketmaster.com/event/${eventId}`;
  return `https://www.ticketmaster.com/search?q=${encodeURIComponent(eventName + ' ' + city + ' ' + date)}`;
}

function getBookingComHotelUrl(hotelBrand, city, checkIn, checkOut) {
  if (hotelBrand) {
    return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotelBrand + ' ' + city)}&checkin_year_month_monthday=${checkIn}&checkout_year_month_monthday=${checkOut}`;
  }
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin_year_month_monthday=${checkIn}&checkout_year_month_monthday=${checkOut}`;
}

function getHotelBrandDirectUrl(brand, city, checkIn, checkOut) {
  if (!brand) return null;
  if (brand.toLowerCase() === 'marriott') {
    return `https://www.marriott.com/search/findHotels.mi?city=${encodeURIComponent(city)}&checkInDate=${checkIn}&checkOutDate=${checkOut}`;
  }
  if (brand.toLowerCase() === 'hilton') {
    return `https://www.hilton.com/en/search/hotels?destination=${encodeURIComponent(city)}&arrivalDate=${checkIn}&departureDate=${checkOut}`;
  }
  // Add more brands as needed
  return null;
}

function getGoogleFlightsUrl(origin, destination, date, airline) {
  let url = `https://www.google.com/flights?hl=en#flt=${origin}.${destination}.${date}`;
  if (airline) url += `;airline=${encodeURIComponent(airline)}`;
  return url;
}

function getCarRentalUrl(brand, city, pickupDate, dropoffDate) {
  if (brand && brand.toLowerCase() === 'hertz') {
    return `https://www.hertz.com/rentacar/reservation/`;
  }
  // Add more brands as needed
  return `https://www.expedia.com/Cars-Search?locn=${encodeURIComponent(city)}&pickup=${pickupDate}&dropoff=${dropoffDate}`;
}

module.exports = {
  getTicketmasterEventUrl,
  getBookingComHotelUrl,
  getHotelBrandDirectUrl,
  getGoogleFlightsUrl,
  getCarRentalUrl
}; 