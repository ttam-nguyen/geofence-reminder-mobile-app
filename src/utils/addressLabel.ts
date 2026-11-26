// Address labels for reminder cards — keep the list readable.
//
// A reminder stores whatever the geocoder returned (`Nominatim.display_name`), which is a long
// most-specific-first string: "Costless Auto Parts, 10507, Northeast 53rd Street, North Image,
// Vancouver, Clark County, Washington, 98662, United States". The card only has room for one line,
// so it shows the saved place name when there is one, and otherwise the street part alone.

/** House number on its own, e.g. `10507`. Nominatim sometimes splits it from the road. */
const HOUSE_NUMBER_ONLY = /^\d+[a-zA-Z]?$/;
/** House number glued to the road, e.g. `10507 Northeast 53rd Street`. */
const LEADING_HOUSE_NUMBER = /^\d+[a-zA-Z]?\s+\S/;

/**
 * The street part of a geocoded address: house number plus road when the address has one, the
 * first component otherwise (a POI name, or a road with no number). City, county, state, postcode
 * and country are dropped.
 */
export function streetLine(address: string | null | undefined): string | null {
  const parts = (address ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0);

  if (parts.length === 0) {
    return null;
  }

  if (HOUSE_NUMBER_ONLY.test(parts[0]) && parts.length > 1) {
    return `${parts[0]} ${parts[1]}`;
  }

  const withNumber = parts.find(part => LEADING_HOUSE_NUMBER.test(part));
  if (withNumber) {
    return withNumber;
  }

  // A POI name can lead the string and push the house number into its own component:
  // "Costless Auto Parts, 10507, Northeast 53rd Street, …". Never pair a trailing postcode with
  // the country that follows it, so stop two components before the end.
  for (let i = 0; i < parts.length - 2; i += 1) {
    if (HOUSE_NUMBER_ONLY.test(parts[i])) {
      return `${parts[i]} ${parts[i + 1]}`;
    }
  }

  return parts[0];
}

/** A starred search result keeps the geocoder string as its name: four or more components. */
const GEOCODED_NAME_PARTS = 4;

/**
 * What a reminder card shows for its location: the saved place name when the coordinates match a
 * place the user knows, otherwise the street line. `null` when the reminder has no address at all.
 */
export function locationLabelFor(
  savedPlaceName: string | null | undefined,
  address: string | null | undefined,
): string | null {
  const named = savedPlaceName?.trim();
  if (named) {
    // A place starred straight from search was never renamed, so its "name" is the long address.
    // Show its street line instead of letting it wrap the card.
    return named.split(',').length >= GEOCODED_NAME_PARTS ? streetLine(named) : named;
  }
  return streetLine(address);
}
