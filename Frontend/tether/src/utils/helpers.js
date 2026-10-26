/**
 * Format a date string to a readable format
 * @param {string} dateStr
 * @returns {string}
 */
export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

/**
 * Truncate a string to a max length
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
export const truncate = (str, max = 100) =>
  str.length > max ? `${str.slice(0, max)}…` : str
