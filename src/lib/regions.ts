// Australian postcode → major city/region mapping
// Used for geographic drill-down in the OSA dashboard

interface RegionDef {
  name: string
  ranges: Array<[number, number]>
}

const QLD_REGIONS: RegionDef[] = [
  { name: 'Brisbane',       ranges: [[4000, 4099], [4100, 4199], [4300, 4349]] },
  { name: 'Gold Coast',     ranges: [[4200, 4299]] },
  { name: 'Sunshine Coast', ranges: [[4500, 4519], [4550, 4579]] },
  { name: 'Ipswich',        ranges: [[4350, 4399]] },
  { name: 'Bundaberg',      ranges: [[4670, 4679]] },
  { name: 'Rockhampton',    ranges: [[4700, 4739]] },
  { name: 'Mackay',         ranges: [[4740, 4749]] },
  { name: 'Townsville',     ranges: [[4810, 4819]] },
  { name: 'Cairns',         ranges: [[4870, 4879]] },
  { name: 'Mt Isa',         ranges: [[4820, 4830]] },
  { name: 'Toowoomba',      ranges: [[4350, 4359]] },
]

const NSW_REGIONS: RegionDef[] = [
  { name: 'Sydney',          ranges: [[2000, 2239], [2555, 2574], [2740, 2786]] },
  { name: 'Central Coast',   ranges: [[2240, 2263]] },
  { name: 'Newcastle',       ranges: [[2264, 2340]] },
  { name: 'Wollongong',      ranges: [[2500, 2554]] },
  { name: 'Canberra',        ranges: [[2600, 2619], [2900, 2920]] },
  { name: 'Orange / Bathurst', ranges: [[2795, 2830]] },
  { name: 'Albury / Wagga',  ranges: [[2640, 2680]] },
  { name: 'Tamworth',        ranges: [[2340, 2360]] },
]

const VIC_REGIONS: RegionDef[] = [
  { name: 'Melbourne',  ranges: [[3000, 3207], [3335, 3342], [3750, 3812]] },
  { name: 'Geelong',    ranges: [[3210, 3234]] },
  { name: 'Ballarat',   ranges: [[3350, 3360]] },
  { name: 'Bendigo',    ranges: [[3550, 3560]] },
  { name: 'Shepparton', ranges: [[3630, 3640]] },
  { name: 'Albury',     ranges: [[3640, 3644]] },
]

const SA_REGIONS: RegionDef[] = [
  { name: 'Adelaide',      ranges: [[5000, 5199]] },
  { name: 'Mount Gambier', ranges: [[5290, 5293]] },
  { name: 'Whyalla',       ranges: [[5600, 5609]] },
]

const WA_REGIONS: RegionDef[] = [
  { name: 'Perth',      ranges: [[6000, 6214]] },
  { name: 'Bunbury',    ranges: [[6230, 6235]] },
  { name: 'Geraldton',  ranges: [[6530, 6535]] },
  { name: 'Kalgoorlie', ranges: [[6430, 6435]] },
]

const TAS_REGIONS: RegionDef[] = [
  { name: 'Hobart',      ranges: [[7000, 7099]] },
  { name: 'Launceston',  ranges: [[7248, 7260]] },
  { name: 'Devonport',   ranges: [[7310, 7320]] },
]

const STATE_REGIONS: Record<string, RegionDef[]> = {
  QLD: QLD_REGIONS,
  NSW: NSW_REGIONS,
  VIC: VIC_REGIONS,
  SA:  SA_REGIONS,
  WA:  WA_REGIONS,
  TAS: TAS_REGIONS,
  ACT: [{ name: 'Canberra', ranges: [[2600, 2619], [2900, 2920]] }],
  NT:  [{ name: 'Darwin',   ranges: [[800, 899]] }],
}

export function getRegion(postcode: string, state: string): string {
  const pc = parseInt(postcode, 10)
  if (isNaN(pc)) return state
  const regions = STATE_REGIONS[state]
  if (!regions) return state
  for (const region of regions) {
    for (const [from, to] of region.ranges) {
      if (pc >= from && pc <= to) return region.name
    }
  }
  return `Other ${state}`
}
