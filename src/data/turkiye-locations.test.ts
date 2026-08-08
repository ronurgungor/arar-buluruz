import { describe, expect, test } from "bun:test";
import { listings } from "./listings";
import { getDistrictsForCity, locationCatalogStats, locationCities } from "./turkiye-locations";

describe("Türkiye location catalog", () => {
  test("contains the verified 81 province / 973 district snapshot", () => {
    expect(locationCatalogStats).toEqual({ provinceCount: 81, districtCount: 973 });
    expect(locationCities).toHaveLength(82);
    expect(locationCities[0]).toBe("Tüm Türkiye");
  });

  test("exposes the full Istanbul district catalog independent from mock supply", () => {
    const districts = getDistrictsForCity("İstanbul");
    expect(districts).toHaveLength(39);
    expect(districts).toContain("Adalar");
    expect(districts).toContain("Kadıköy");
    expect(districts).toContain("Şişli");
    expect(districts).toContain("Zeytinburnu");
  });

  test("loads correct catalog slices for Ankara, İzmir and Tekirdağ", () => {
    expect(getDistrictsForCity("Ankara")).toHaveLength(25);
    expect(getDistrictsForCity("Ankara")).toContain("Keçiören");
    expect(getDistrictsForCity("İzmir")).toHaveLength(30);
    expect(getDistrictsForCity("İzmir")).toContain("Konak");
    expect(getDistrictsForCity("Tekirdağ")).toHaveLength(11);
    expect(getDistrictsForCity("Tekirdağ")).toContain("Çorlu");
    expect(getDistrictsForCity("Tekirdağ")).toContain("Süleymanpaşa");
  });

  test("keeps every synthetic listing location inside the catalog", () => {
    for (const listing of listings) {
      expect(locationCities).toContain(listing.city);
      expect(getDistrictsForCity(listing.city)).toContain(listing.district);
    }
  });

  test("contains no duplicate districts within a province and preserves Turkish display casing", () => {
    for (const city of locationCities.slice(1)) {
      const districts = getDistrictsForCity(city);
      expect(new Set(districts).size).toBe(districts.length);
    }
    expect(getDistrictsForCity("Samsun")).toContain("19 Mayıs");
  });
});
