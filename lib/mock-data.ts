/**
 * Mock Data
 * 
 * Provides sample/demonstration data for the dashboard when Supabase
 * is not configured. This data simulates a pharmaceutical company's
 * business metrics including sales, inventory, and KPIs.
 * 
 * @module mock-data
 * @description Fallback data for demonstration and development
 */

/**
 * Sales Data
 * 
 * Monthly sales figures vs targets for the current year.
 * Used to populate the SalesChart component.
 * 
 * @type {Array<{month: string, sales: number, target: number}>}
 */
export const salesData = [
  { month: 'Jan', sales: 4000, target: 2400 },
  { month: 'Feb', sales: 3000, target: 1398 },
  { month: 'Mar', sales: 2000, target: 9800 },
  { month: 'Apr', sales: 2780, target: 3908 },
  { month: 'May', sales: 1890, target: 4800 },
  { month: 'Jun', sales: 2390, target: 3800 },
  { month: 'Jul', sales: 3490, target: 4300 },
];

/**
 * Inventory Data
 * 
 * Product inventory levels with status indicators.
 * Used to populate the InventoryTable component.
 * 
 * @type {Array<{product: string, stock: number, status: string}>}
 */
export const inventoryData = [
  { product: 'Vaccine A', stock: 1200, status: 'Healthy' },
  { product: 'Medicine B', stock: 300, status: 'Low' },
  { product: 'Supplement C', stock: 800, status: 'Healthy' },
  { product: 'Treatment D', stock: 50, status: 'Critical' },
];

/**
 * Key Performance Indicators (KPIs)
 * 
 * Business metrics with values, changes, and trend indicators.
 * Used to populate the KpiCards component.
 * 
 * @type {Array<{title: string, value: string, change: string, trend: string}>}
 */
export const kpis = [
  { title: 'Total Revenue', value: '$1.2M', change: '+12.5%', trend: 'up' },
  { title: 'Active Users', value: '8,432', change: '+5.2%', trend: 'up' },
  { title: 'Inventory Alerts', value: '12', change: '-2', trend: 'down' },
];
