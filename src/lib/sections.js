// Ангийн бүлэг тоогоор: 10-1, 10-2, ... (өмнө үсгээр бүртгүүлсэн сурагчид "10а" хэвээр харагдана)
export const SECTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));

export const classLabel = (grade, section) =>
  section == null || section === '' ? `${grade}` : /^\d+$/.test(section) ? `${grade}-${section}` : `${grade}${section}`;

// Тоон бүлгийг 1, 2, ..., 10 дарааллаар; үсгийг араас нь
export const sortSections = (list) =>
  [...list].sort((a, b) => {
    const na = /^\d+$/.test(a), nb = /^\d+$/.test(b);
    if (na && nb) return Number(a) - Number(b);
    if (na !== nb) return na ? -1 : 1;
    return String(a).localeCompare(String(b));
  });
