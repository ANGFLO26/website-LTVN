import type { Machine } from '../types';

// Form state includes read-only metadata and relations; mutations do not.
export function machineMutationPayload(machine: Machine) {
  return {
    name: machine.name,
    slug: machine.slug,
    model: machine.model,
    shortDescription: machine.shortDescription,
    description: machine.description,
    mainImageId: machine.mainImageId === undefined ? undefined : machine.mainImageId?.trim() || null,
    status: machine.status,
    sortOrder: machine.sortOrder,
    applications: machine.applications?.map((item) => ({
      title: item.title,
      description: item.description,
      sortOrder: item.sortOrder,
    })),
    highlights: machine.highlights?.map((item) => ({
      title: item.title,
      description: item.description,
      icon: item.icon,
      sortOrder: item.sortOrder,
    })),
    specs: machine.specs?.map((item) => ({
      groupName: item.groupName,
      specName: item.specName,
      specValue: item.specValue,
      unit: item.unit,
      sortOrder: item.sortOrder,
    })),
    standards: machine.standards?.map((item) => ({
      standardId: item.standardId,
      note: item.note,
      sortOrder: item.sortOrder,
    })),
  };
}
