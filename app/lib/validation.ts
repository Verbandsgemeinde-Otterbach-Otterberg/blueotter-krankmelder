export interface ValidationResult {
  valid: boolean;
  error?: string;
  daysCount?: number;
  requiresAU?: boolean;
}

export interface FolgebescheinigungValidationResult {
  valid: boolean;
  warning?: string;
  hasPredecessor: boolean;
}

export function validateFolgebescheinigungContinuity(
  db: any,
  employee_vorname: string,
  employer: string,
  from_date: string
): FolgebescheinigungValidationResult {
  try {
    // Query for the most recent Erstbescheinigung (is_first_cert=true) for this employee + employer
    const stmt = db.prepare(`
      SELECT data_json FROM submissions 
      WHERE type = 'auscan' 
        AND JSON_EXTRACT(data_json, '$.employee_vorname') = ?
        AND JSON_EXTRACT(data_json, '$.employer') = ?
        AND JSON_EXTRACT(data_json, '$.is_first_cert') = 'true'
      ORDER BY JSON_EXTRACT(data_json, '$.to_date') DESC
      LIMIT 1
    `);

    const predecessor = stmt.get(employee_vorname, employer);

    if (!predecessor) {
      return {
        valid: true, // Still accept but warn
        warning: 'Keine unmittelbar vorangehende Erstbescheinigung gefunden. Bitte überprüfen Sie, ob dies korrekt ist.',
        hasPredecessor: false,
      };
    }

    // Check if the dates are continuous (no gap)
    try {
      const predData = JSON.parse(predecessor.data_json);
      const predecessorToDate = new Date(predData.to_date);
      const followerFromDate = new Date(from_date);

      // Add 1 day to predecessor's to_date
      const expectedFromDate = new Date(predecessorToDate);
      expectedFromDate.setDate(expectedFromDate.getDate() + 1);

      // Normalize dates for comparison (remove time)
      const expectedDateOnly = new Date(expectedFromDate.getFullYear(), expectedFromDate.getMonth(), expectedFromDate.getDate());
      const actualDateOnly = new Date(followerFromDate.getFullYear(), followerFromDate.getMonth(), followerFromDate.getDate());

      if (expectedDateOnly.getTime() !== actualDateOnly.getTime()) {
        return {
          valid: true, // Still accept but warn
          warning: `⚠ Datenlücke erkannt! Die Erstbescheinigung endet am ${predecessorToDate.toLocaleDateString('de-DE')}, aber die Folgebescheinigung beginnt am ${followerFromDate.toLocaleDateString('de-DE')}. Erwartet: ${expectedDateOnly.toLocaleDateString('de-DE')}`,
          hasPredecessor: true,
        };
      }

      return {
        valid: true,
        hasPredecessor: true,
      };
    } catch (parseError) {
      console.error('Error parsing predecessor data:', parseError);
      return {
        valid: true, // Still accept even if parsing fails
        warning: 'Vorgänger-Datensatz konnte nicht vollständig validiert werden.',
        hasPredecessor: true,
      };
    }
  } catch (error) {
    console.error('Error in Folgebescheinigung validation:', error);
    return {
      valid: true, // Still accept even if database error
      hasPredecessor: false,
    };
  }
}

export function validateDateRange(fromDate: string, toDate: string): ValidationResult {
  try {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return {
        valid: false,
        error: 'Ungültiges Datumsformat',
      };
    }

    if (from > to) {
      return {
        valid: false,
        error: 'Startdatum kann nicht nach Enddatum liegen',
      };
    }

    // Calculate calendar days (inclusive)
    const daysCount = calculateCalendarDays(from, to);

    return {
      valid: true,
      daysCount,
      requiresAU: false,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Fehler bei der Datumsvalidierung',
    };
  }
}

export function validateAUDateRange(
  doctorDate: string,
  fromDate: string,
  toDate: string
): ValidationResult {
  try {
    const doctor = new Date(doctorDate);
    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (isNaN(doctor.getTime()) || isNaN(from.getTime()) || isNaN(to.getTime())) {
      return {
        valid: false,
        error: 'Ungültiges Datumsformat',
      };
    }

    if (from > to) {
      return {
        valid: false,
        error: 'Startdatum kann nicht nach Enddatum liegen',
      };
    }

    const daysCount = calculateCalendarDays(from, to);

    return {
      valid: true,
      daysCount,
      requiresAU: false,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Fehler bei der Datumsvalidierung',
    };
  }
}

export function validateChildcareDateRange(fromDate: string, toDate: string): ValidationResult {
  try {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return {
        valid: false,
        error: 'Ungültiges Datumsformat',
      };
    }

    if (from > to) {
      return {
        valid: false,
        error: 'Startdatum kann nicht nach Enddatum liegen',
      };
    }

    const daysCount = calculateCalendarDays(from, to);

    if (daysCount > 3 && !true) {
      // AU will be checked at submission time
      return {
        valid: false,
        error: `Die Abwesenheit beträgt ${daysCount} Kalendertage. Ab dem 4. Kalendertag ist eine ärztliche Bescheinigung erforderlich.`,
        daysCount,
        requiresAU: true,
      };
    }

    return {
      valid: true,
      daysCount,
      requiresAU: daysCount > 3,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Fehler bei der Datumsvalidierung',
    };
  }
}

function calculateCalendarDays(from: Date, to: Date): number {
  const fromDate = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toDate = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const diffTime = toDate.getTime() - fromDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 because inclusive
  return diffDays;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateFileType(fileName: string, allowedTypes: string[]): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? allowedTypes.includes(ext) : false;
}
