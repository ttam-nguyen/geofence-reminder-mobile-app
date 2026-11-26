// Tests for the shared saved/recent place store.

import {
  MAX_PLACE_NAME_LENGTH,
  clearHistory,
  findPlaceNear,
  findSavedPlaceNear,
  listPlaces,
  listSavedPlaces,
  rememberPlace,
  removePlace,
  renamePlace,
  resetPlacesForTests,
  setPlaceSaved,
  sortPlaces,
  type SavedPlace,
} from '../placeStore';

const HOME = { name: 'Home', latitude: 45.6614, longitude: -122.6113 };
const WORK = { name: 'Work', latitude: 45.6601, longitude: -122.5651 };

beforeEach(async () => {
  await resetPlacesForTests();
});

describe('rememberPlace', () => {
  it('stores a new place as a recent entry', async () => {
    const places = await rememberPlace(HOME);

    expect(places).toHaveLength(1);
    expect(places[0].name).toBe('Home');
    expect(places[0].saved).toBe(false);
    expect(places[0].latitude).toBeCloseTo(HOME.latitude, 5);
  });

  it('treats a nearby coordinate as the same place instead of adding a duplicate', async () => {
    await rememberPlace(HOME);
    // ~11 m away: inside the 30 m same-place window.
    const places = await rememberPlace({ ...HOME, latitude: HOME.latitude + 0.0001 });

    expect(places).toHaveLength(1);
  });

  it('keeps two places that are far apart', async () => {
    await rememberPlace(HOME);
    const places = await rememberPlace(WORK);

    expect(places).toHaveLength(2);
  });

  it('keeps the favourite flag when a saved place is used again', async () => {
    const [home] = await rememberPlace(HOME);
    await setPlaceSaved(home.id, true);

    const places = await rememberPlace(HOME);

    expect(places).toHaveLength(1);
    expect(places[0].saved).toBe(true);
  });
});

describe('setPlaceSaved', () => {
  it('promotes a recent entry to a favourite and back', async () => {
    const [home] = await rememberPlace(HOME);

    await setPlaceSaved(home.id, true);
    expect((await listSavedPlaces()).map(place => place.name)).toEqual(['Home']);

    await setPlaceSaved(home.id, false);
    expect(await listSavedPlaces()).toHaveLength(0);
  });

  it('ignores an unknown id', async () => {
    await rememberPlace(HOME);
    const places = await setPlaceSaved('does-not-exist', true);

    expect(places).toHaveLength(1);
    expect(places[0].saved).toBe(false);
  });
});

describe('findPlaceNear', () => {
  it('finds the place at a coordinate, for card nicknames', async () => {
    const places = await rememberPlace(HOME);

    expect(findPlaceNear(places, HOME.latitude, HOME.longitude)?.name).toBe('Home');
  });

  it('tolerates a small offset, such as a pin dropped at the door', async () => {
    const places = await rememberPlace(HOME);

    const near = findPlaceNear(places, HOME.latitude + 0.0001, HOME.longitude + 0.0001);
    expect(near?.name).toBe('Home');
  });

  it('returns undefined for a coordinate that is not a saved place', async () => {
    const places = await rememberPlace(WORK);

    expect(findPlaceNear(places, HOME.latitude, HOME.longitude)).toBeUndefined();
  });
});

describe('findSavedPlaceNear', () => {
  it('finds a starred place at a coordinate, for card labels', async () => {
    const [home] = await rememberPlace(HOME);
    const places = await setPlaceSaved(home.id, true);

    expect(findSavedPlaceNear(places, HOME.latitude, HOME.longitude)?.name).toBe('Home');
  });

  it('ignores an unstarred recent search', async () => {
    const places = await rememberPlace(HOME);

    expect(findSavedPlaceNear(places, HOME.latitude, HOME.longitude)).toBeUndefined();
  });
});

describe('renamePlace', () => {
  it('renames a saved place and keeps its star', async () => {
    const [home] = await rememberPlace(HOME);
    await setPlaceSaved(home.id, true);

    const places = await renamePlace(home.id, '  Flat  ');

    expect(places[0].name).toBe('Flat');
    expect(places[0].saved).toBe(true);
  });

  it('rejects a blank name instead of clearing it', async () => {
    const [home] = await rememberPlace(HOME);

    await expect(renamePlace(home.id, '   ')).rejects.toThrow('cannot be empty');
    expect((await listPlaces())[0].name).toBe('Home');
  });

  it('trims to the maximum length', async () => {
    const [home] = await rememberPlace(HOME);

    const places = await renamePlace(home.id, 'x'.repeat(MAX_PLACE_NAME_LENGTH + 20));

    expect(places[0].name).toHaveLength(MAX_PLACE_NAME_LENGTH);
  });

  it('does not rename a favourite into a new record', async () => {
    const [home] = await rememberPlace(HOME);

    await renamePlace(home.id, 'Parents');

    const places = await listPlaces();
    expect(places).toHaveLength(1);
    expect(places[0].latitude).toBeCloseTo(HOME.latitude, 5);
  });
});

describe('clearHistory', () => {
  it('drops recent entries but keeps favourites', async () => {
    const [home] = await rememberPlace(HOME);
    await setPlaceSaved(home.id, true);
    await rememberPlace(WORK);

    const places = await clearHistory();

    expect(places.map(place => place.name)).toEqual(['Home']);
  });
});

describe('removePlace', () => {
  it('removes one entry by id', async () => {
    const [home] = await rememberPlace(HOME);
    await rememberPlace(WORK);

    const places = await removePlace(home.id);

    expect(places.map(place => place.name)).toEqual(['Work']);
  });
});

describe('sortPlaces', () => {
  it('puts favourites first, then the most recently used', () => {
    const make = (name: string, saved: boolean, lastUsedAt: string): SavedPlace => ({
      id: name,
      name,
      latitude: 0,
      longitude: 0,
      saved,
      createdAt: lastUsedAt,
      lastUsedAt,
    });

    const sorted = sortPlaces([
      make('recent-old', false, '2026-01-01T00:00:00.000Z'),
      make('fav', true, '2025-01-01T00:00:00.000Z'),
      make('recent-new', false, '2026-06-01T00:00:00.000Z'),
    ]);

    expect(sorted.map(place => place.name)).toEqual(['fav', 'recent-new', 'recent-old']);
  });
});

describe('listPlaces', () => {
  it('returns an empty list after a reset', async () => {
    expect(await listPlaces()).toEqual([]);
  });
});
