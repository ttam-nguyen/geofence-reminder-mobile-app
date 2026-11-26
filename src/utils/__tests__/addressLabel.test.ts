import { locationLabelFor, streetLine } from '../addressLabel';

// Real strings from this project's device data, so the reducer is tested against the format the
// app actually stores (Nominatim display_name), not a tidy invented one.
const COSTLESS =
  'Costless Auto Parts, 10507, Northeast 53rd Street, North Image, Vancouver, Clark County, Washington, 98662, United States';
const WEST_29TH =
  '1212, West 29th Street, Carter Park, Vancouver, Clark County, Washington, 98660, United States';

describe('streetLine', () => {
  it('keeps the house number and road, dropping city, county, state, postcode and country', () => {
    expect(streetLine(COSTLESS)).toBe('10507 Northeast 53rd Street');
    expect(streetLine(WEST_29TH)).toBe('1212 West 29th Street');
  });

  it('keeps a road that already contains its house number', () => {
    expect(streetLine('1250 Rue Sainte-Catherine, Montréal, Québec, H3B 1K1, Canada')).toBe(
      '1250 Rue Sainte-Catherine',
    );
  });

  it('returns a bare street name when the address has no house number', () => {
    expect(streetLine('Northeast 53rd Street, Vancouver, Washington, United States')).toBe(
      'Northeast 53rd Street',
    );
  });

  it('returns a point-of-interest name when that is all the address carries', () => {
    expect(streetLine('Costless Auto Parts')).toBe('Costless Auto Parts');
  });

  it('tolerates stray commas and whitespace', () => {
    expect(streetLine('  10507 , , Northeast 53rd Street , Vancouver ')).toBe(
      '10507 Northeast 53rd Street',
    );
  });

  it('returns null for an empty or missing address', () => {
    expect(streetLine(null)).toBeNull();
    expect(streetLine(undefined)).toBeNull();
    expect(streetLine('')).toBeNull();
    expect(streetLine('   ,  , ')).toBeNull();
  });
});

describe('locationLabelFor', () => {
  it('prefers the name the place is saved under', () => {
    expect(locationLabelFor('Home', COSTLESS)).toBe('Home');
    expect(locationLabelFor('Gym', null)).toBe('Gym');
  });

  it('falls back to the street line when no place matches', () => {
    expect(locationLabelFor(undefined, COSTLESS)).toBe('10507 Northeast 53rd Street');
    expect(locationLabelFor(null, WEST_29TH)).toBe('1212 West 29th Street');
  });

  it('ignores a blank place name rather than showing an empty line', () => {
    expect(locationLabelFor('   ', COSTLESS)).toBe('10507 Northeast 53rd Street');
    expect(locationLabelFor('', null)).toBeNull();
  });

  it('shortens a starred place that was never renamed, because its name is the address', () => {
    expect(locationLabelFor(WEST_29TH, null)).toBe('1212 West 29th Street');
  });

  it('keeps a user-typed name that happens to contain a comma', () => {
    expect(locationLabelFor("Mom's house, back gate", COSTLESS)).toBe("Mom's house, back gate");
  });
});
