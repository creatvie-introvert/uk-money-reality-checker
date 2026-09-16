// Display source dates without collapsing distinct publication/effective periods.
export function sourcePeriodText(period: string) {
  return period.replace(/\b(\d{4})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?\b/g, (_, year: string, month: string, day?: string) => {
    const name = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][Number(month) - 1];
    return `${day ? `${Number(day)} ` : ""}${name} ${year}`;
  });
}

