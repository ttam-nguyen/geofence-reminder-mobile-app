// Tests for the shared saved/recent place store.

import {
  clearHistory,
  listPlaces,
  listSavedPlaces,
  rememberPlace,
  removePlace,
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
