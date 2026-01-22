// dapbase.connection.js - Dapbase v3.0 with Schema Validation
// Auto-generated — do not edit manually

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const writeFileAtomic = require('write-file-atomic');

const DAPBASE_ROOT = __dirname;
let currentDb = null;
let currentDbPath = null;

const CONFIG_PATH = path.join(DAPBASE_ROOT, '..', 'dapbase.config.json');
const ENCRYPTION_KEY_PATH = path.join(DAPBASE_ROOT, '..', '.encryption.key');

let config = {};
let encryptionKey = null;

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    if (config.encryptionEnabled && fs.existsSync(ENCRYPTION_KEY_PATH)) {
      encryptionKey = fs.readFileSync(ENCRYPTION_KEY_PATH, 'utf-8').trim();
      console.log('Encryption key loaded');
    }
  }
}

loadConfig();

// Schema validation types and constraints
const validators = {
  types: {
    text: (value) => typeof value === 'string',
    string: (value) => typeof value === 'string',
    int: (value) => Number.isInteger(Number(value)),
    integer: (value) => Number.isInteger(Number(value)),
    float: (value) => !isNaN(Number(value)),
    number: (value) => !isNaN(Number(value)),
    boolean: (value) => typeof value === 'boolean' || ['true', 'false', '1', '0'].includes(String(value)),
    uuid: (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
    timestamp: (value) => !isNaN(Date.parse(value)),
    date: (value) => !isNaN(Date.parse(value)),
    json: (value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }
  },

  constraints: {
    required: (value, isRequired) => !isRequired || (value !== undefined && value !== null),
    unique: (value, values, isUnique) => !isUnique || !values.includes(value),
    min: (value, min) => value >= min,
    max: (value, max) => value <= max,
    minLength: (value, min) => String(value).length >= min,
    maxLength: (value, max) => String(value).length <= max,
    pattern: (value, pattern) => new RegExp(pattern).test(String(value)),
    default: (value, defaultValue) => value !== undefined ? value : defaultValue
  }
};

class SchemaValidator {
  static validateRow(row, schema, existingRows = []) {
    const errors = [];
    const validatedRow = { ...row };
  
    // Process each defined column in schema
    for (const [column, definition] of Object.entries(schema)) {
      let value = row[column];
      const isNew = !existingRows.some(r => r.id === (row.id || validatedRow.id));
      const existingValues = existingRows.map(r => r[column]);
  
      // 1. Apply default FIRST if missing
      if (value === undefined && definition.default !== undefined) {
        if (definition.default === 'NOW') {
          value = new Date().toISOString();
        } else if (typeof definition.default === 'function') {
          value = definition.default();
        } else {
          value = definition.default;
        }
        validatedRow[column] = value;
        // console.log(`Applied default for ${column}: ${value}`);
      }
  
      // 2. Type validation
      if (definition.type && value !== undefined && value !== null) {
        const typeValidator = validators.types[definition.type];
        if (typeValidator && !typeValidator(value)) {
          errors.push(`Column "${column}": Expected type "${definition.type}", got "${typeof value}"`);
        }
      }
  
      // 3. Required check — after default
      if (definition.required && (value === undefined || value === null)) {
        errors.push(`Column "${column}" is required`);
      }
  
      // 4. Unique (only new rows)
      if (definition.unique && value !== undefined && value !== null && isNew) {
        if (existingValues.includes(value)) {
          errors.push(`Column "${column}" must be unique. Value "${value}" already exists`);
        }
      }
  
      // 5. Numeric constraints
      if (definition.min !== undefined && value !== undefined && value !== null) {
        if (typeof value !== 'number' || value < definition.min) {
          errors.push(`Column "${column}": Value ${value} is less than minimum ${definition.min}`);
        }
      }
      if (definition.max !== undefined && value !== undefined && value !== null) {
        if (typeof value !== 'number' || value > definition.max) {
          errors.push(`Column "${column}": Value ${value} exceeds maximum ${definition.max}`);
        }
      }
  
      // 6. String length
      if (definition.minLength !== undefined && value !== undefined && value !== null) {
        if (String(value).length < definition.minLength) {
          errors.push(`Column "${column}": Length ${String(value).length} < min ${definition.minLength}`);
        }
      }
      if (definition.maxLength !== undefined && value !== undefined && value !== null) {
        if (String(value).length > definition.maxLength) {
          errors.push(`Column "${column}": Length ${String(value).length} > max ${definition.maxLength}`);
        }
      }
  
      // 7. Pattern
      if (definition.pattern && value !== undefined && value !== null) {
        if (!new RegExp(definition.pattern).test(String(value))) {
          errors.push(`Column "${column}": Value "${value}" doesn't match pattern "${definition.pattern}"`);
        }
      }
    }
  
    // 8. Extra fields check — use validatedRow (after defaults!)
    for (const field of Object.keys(validatedRow)) {
      if (!schema[field] && field !== 'id') {
        errors.push(`Field "${field}" is not defined in schema`);
      }
    }
  
    if (errors.length > 0) {
      throw new Error(`Schema validation failed:\n${errors.join('\n')}`);
    }
  
    return validatedRow;
  }
}

const db = {
  // Use or create a database folder
  async use(databaseName) {
    if (!databaseName || typeof databaseName !== 'string') {
      throw new Error('Database name must be a non-empty string');
    }

    currentDb = databaseName.trim();
    currentDbPath = path.join(DAPBASE_ROOT, currentDb);

    if (!fs.existsSync(currentDbPath)) {
      fs.mkdirSync(currentDbPath, { recursive: true });
      console.log(`Created new database folder: ${currentDb}`);
    } else {
      console.log(`Using database: ${currentDb}`);
    }

    return db;
  },

  // Ensure DB is selected (auto-use default if not)
  async ensureDb() {
    if (!currentDbPath && config.defaultDatabase) {
      console.log(`Auto-using default database: ${config.defaultDatabase}`);
      await db.use(config.defaultDatabase);
    }
    if (!currentDbPath) throw new Error('No database selected and no default in config');
  },

  // Create table with enhanced schema definition
  async createTable(tableName, columns, relationships = {}, options = {}) {
    await db.ensureDb();
    if (!tableName || typeof tableName !== 'string') throw new Error('Table name required');
    if (!columns || typeof columns !== 'object') throw new Error('Columns definition required');

    const tablePath = path.join(currentDbPath, `${tableName}.table`);
    if (fs.existsSync(tablePath)) {
      throw new Error(`Table "${tableName}" already exists`);
    }

    // Enhanced schema format: { column: { type: 'text', unique: true, required: true } }
    const normalizedColumns = {};
    for (const [colName, colDef] of Object.entries(columns)) {
      if (typeof colDef === 'string') {
        normalizedColumns[colName] = { type: colDef };
      } else if (typeof colDef === 'object') {
        normalizedColumns[colName] = colDef;
      } else {
        throw new Error(`Invalid column definition for "${colName}"`);
      }
    }

    // Auto-add id field if not present (always first)
    if (!normalizedColumns.id) {
      normalizedColumns.id = { type: 'uuid', required: true };
    }

    // Auto-add timestamps only if not already defined by user
    if (options.timestamps !== false) {
      if (!normalizedColumns.createdAt) {
        normalizedColumns.createdAt = {
          type: 'string',
          default: 'NOW'
        };
      }
      if (!normalizedColumns.updatedAt) {
        normalizedColumns.updatedAt = {
          type: 'string',
          default: 'NOW'
        };
      }
    }

    

    // Now create tableData with full columns
    const tableData = {
      name: tableName,
      createdAt: new Date().toISOString(),
      columns: normalizedColumns,
      relationships,
      rows: [],
      indexes: {},
      options: {
        encryption: options.encryption || {},
        timestamps: options.timestamps !== false
      }
    };

    await writeFileAtomic(tablePath, JSON.stringify(tableData, null, 2), { encoding: 'utf8' });
    console.log(`Table "${tableName}" created with schema validation support`);
    return db;
  },

  async insert(tableName, rowData, options = {}) {
    await db.ensureDb();

    const tablePath = path.join(currentDbPath, `${tableName}.table`);
    if (!fs.existsSync(tablePath)) throw new Error(`Table "${tableName}" not found`);

    const table = JSON.parse(fs.readFileSync(tablePath, 'utf-8'));

    if (table.options.encryption?.fields?.length > 0 && !encryptionKey) {
      console.warn('Warning: Encryption enabled but no key loaded!');
    }

    let enhancedRow = { ...rowData };

    // Auto-generate id only
    if (table.columns.id && table.columns.id.type === 'uuid' && !enhancedRow.id) {
      enhancedRow.id = crypto.randomUUID();
    }

    // Validate (timestamps will be auto-filled by defaults)
    const validatedRow = SchemaValidator.validateRow(enhancedRow, table.columns, table.rows);

    // Foreign key validation
    for (const field in table.relationships) {
      if (validatedRow[field] !== undefined) {
        const { foreignTable, foreignKey } = table.relationships[field];
        const foreignPath = path.join(currentDbPath, `${foreignTable}.table`);
        
        if (!fs.existsSync(foreignPath)) {
          throw new Error(`Foreign table "${foreignTable}" does not exist`);
        }
        
        const foreignTableData = JSON.parse(fs.readFileSync(foreignPath, 'utf-8'));
        const exists = foreignTableData.rows.some(row => row[foreignKey] === validatedRow[field]);
        
        if (!exists) {
          throw new Error(`Foreign key violation: ${field}=${validatedRow[field]} not found in ${foreignTable}`);
        }
      }
    }

    // Encryption
    if (table.options.encryption && table.options.encryption.fields) {
      for (const field of table.options.encryption.fields) {
        if (validatedRow[field] !== undefined) {
          validatedRow[field] = db._encryptField(validatedRow[field], encryptionKey);
        }
      }
    }

    table.rows.push(validatedRow);
    await writeFileAtomic(tablePath, JSON.stringify(table, null, 2), { encoding: 'utf8' });
    
    if (options.silent !== true) {
      console.log(`Inserted into "${tableName}":`, validatedRow);
    }
    
    return validatedRow;
  },
  // Bulk insert
  async insertMany(tableName, rowsData, options = {}) {
    const results = [];
    for (const rowData of rowsData) {
      const result = await db.insert(tableName, rowData, { ...options, silent: true });
      results.push(result);
    }
    
    if (options.silent !== true) {
      console.log(`Inserted ${results.length} rows into "${tableName}"`);
    }
    
    return results;
  },

  // Select with advanced querying
  async select(tableName, options = {}) {
    await db.ensureDb();

    const tablePath = path.join(currentDbPath, `${tableName}.table`);
    if (!fs.existsSync(tablePath)) throw new Error(`Table "${tableName}" not found`);

    const table = JSON.parse(fs.readFileSync(tablePath, 'utf-8'));
    let rows = [...table.rows];

    // Decrypt fields if needed
    if (table.options.encryption && table.options.encryption.fields && encryptionKey) {
      rows = rows.map(row => {
        const decrypted = { ...row };
        for (const field of table.options.encryption.fields) {
          if (decrypted[field] && typeof decrypted[field] === 'object' && decrypted[field].encrypted) {
            decrypted[field] = db._decryptField(decrypted[field], encryptionKey);
          }
        }
        return decrypted;
      });
    }

    // WHERE filter with operators
    if (options.where) {
      rows = rows.filter(row => {
        return Object.entries(options.where).every(([key, condition]) => {
          if (condition === undefined || condition === null) {
            return row[key] === condition;
          }
          
          // Handle operator syntax: { age: { $gt: 18 } }
          if (typeof condition === 'object' && !Array.isArray(condition)) {
            return Object.entries(condition).every(([operator, value]) => {
              switch (operator) {
                case '$eq': return row[key] === value;
                case '$ne': return row[key] !== value;
                case '$gt': return row[key] > value;
                case '$gte': return row[key] >= value;
                case '$lt': return row[key] < value;
                case '$lte': return row[key] <= value;
                case '$in': return Array.isArray(value) && value.includes(row[key]);
                case '$nin': return Array.isArray(value) && !value.includes(row[key]);
                case '$like': return String(row[key]).includes(String(value));
                case '$regex': return new RegExp(value).test(String(row[key]));
                default: return row[key] === condition;
              }
            });
          }
          
          // Handle array values
          if (Array.isArray(condition)) {
            return condition.includes(row[key]);
          }
          
          // Simple equality
          return row[key] === condition;
        });
      });
    }

    // JOIN support
    if (options.join && Array.isArray(options.join)) {
      for (const join of options.join) {
        const { table: joinTable, on, as = joinTable, type = 'left' } = join;
        const joinPath = path.join(currentDbPath, `${joinTable}.table`);
        
        if (!fs.existsSync(joinPath)) {
          if (type === 'inner') {
            rows = []; // Inner join with missing table = no results
            break;
          }
          continue;
        }

        const joinData = JSON.parse(fs.readFileSync(joinPath, 'utf-8'));
        const joinRows = joinData.rows;

        rows = rows.map(row => {
          const related = joinRows.filter(jrow => jrow[on.foreign] === row[on.local]);
          
          if (type === 'inner' && related.length === 0) {
            return null; // Filter out in next step
          }
          
          return { 
            ...row, 
            [as]: related.length > 0 ? (related.length === 1 ? related[0] : related) : null 
          };
        }).filter(row => row !== null); // Remove nulls from inner joins
      }
    }

    // Sorting
    if (options.orderBy) {
      const [field, direction = 'asc'] = Array.isArray(options.orderBy) 
        ? options.orderBy 
        : [options.orderBy, 'asc'];
      
      rows.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal === bVal) return 0;
        if (aVal === undefined || aVal === null) return direction === 'asc' ? -1 : 1;
        if (bVal === undefined || bVal === null) return direction === 'asc' ? 1 : -1;
        
        const comparison = aVal < bVal ? -1 : 1;
        return direction === 'asc' ? comparison : -comparison;
      });
    }

    // Pagination
    if (options.limit || options.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || rows.length;
      rows = rows.slice(offset, offset + limit);
    }

    // Field selection
    if (options.fields && Array.isArray(options.fields)) {
      rows = rows.map(row => {
        const selected = {};
        options.fields.forEach(field => {
          if (row[field] !== undefined) {
            selected[field] = row[field];
          }
        });
        return selected;
      });
    }

    if (options.silent !== true) {
      console.log(`\n${rows.length} row(s) from "${tableName}":`);
      if (rows.length > 0) {
        console.table(rows);
      }
    }
    
    return rows;
  },

  
  async update(tableName, updates, where, options = {}) {
    await db.ensureDb();
    const tablePath = path.join(currentDbPath, `${tableName}.table`);
    if (!fs.existsSync(tablePath)) throw new Error(`Table "${tableName}" not found`);
  
    const table = JSON.parse(fs.readFileSync(tablePath, 'utf-8'));
    let updatedCount = 0;
    const updatedRows = [];
    const errors = [];
  
    // Helper function to match WHERE conditions (same as select uses)
    const matchesWhere = (row) => {
      return Object.entries(where).every(([key, condition]) => {
        if (condition === undefined || condition === null) {
          return row[key] === condition;
        }
        
        // Handle operator syntax
        if (typeof condition === 'object' && !Array.isArray(condition)) {
          return Object.entries(condition).every(([operator, value]) => {
            switch (operator) {
              case '$eq': return row[key] === value;
              case '$ne': return row[key] !== value;
              case '$gt': return row[key] > value;
              case '$gte': return row[key] >= value;
              case '$lt': return row[key] < value;
              case '$lte': return row[key] <= value;
              case '$in': return Array.isArray(value) && value.includes(row[key]);
              case '$nin': return Array.isArray(value) && !value.includes(row[key]);
              case '$like': return String(row[key]).includes(String(value));
              case '$regex': return new RegExp(value).test(String(row[key]));
              default: return row[key] === condition;
            }
          });
        }
        
        // Handle array values
        if (Array.isArray(condition)) {
          return condition.includes(row[key]);
        }
        
        // Simple equality
        return row[key] === condition;
      });
    };
  
    table.rows = table.rows.map(row => {
      if (matchesWhere(row)) {
        const updatedRow = { ...row, ...updates };
        
        try {
          const validatedRow = SchemaValidator.validateRow(updatedRow, table.columns, table.rows.filter(r => r.id !== row.id));
          
          // Manual updatedAt on update
          if (table.options.timestamps && table.columns.updatedAt) {
            validatedRow.updatedAt = new Date().toISOString();
          }
  
          // Re-encrypt
          if (table.options.encryption && table.options.encryption.fields) {
            for (const field of table.options.encryption.fields) {
              if (validatedRow[field] !== undefined && !(validatedRow[field]?.encrypted)) {
                validatedRow[field] = db._encryptField(validatedRow[field], encryptionKey);
              }
            }
          }
          
          updatedCount++;
          updatedRows.push(validatedRow);
          return validatedRow;
        } catch (error) {
          errors.push(`Row ${row.id || 'unknown'}: ${error.message}`);
          return row;
        }
      }
      
      return row;
    });
  
    if (errors.length > 0 && options.strict !== false) {
      throw new Error(`Update validation failed:\n${errors.join('\n')}`);
    }
  
    if (updatedCount > 0) {
      await writeFileAtomic(tablePath, JSON.stringify(table, null, 2), { encoding: 'utf8' });
    }
    
    if (options.silent !== true) {
      console.log(`Updated ${updatedCount} row(s) in "${tableName}"`);
    }
    
    return { count: updatedCount, rows: updatedRows };
  },
  // Delete with cascading options
  async delete(tableName, where, options = {}) {
    await db.ensureDb();
    const tablePath = path.join(currentDbPath, `${tableName}.table`);
    if (!fs.existsSync(tablePath)) throw new Error(`Table "${tableName}" not found`);

    const table = JSON.parse(fs.readFileSync(tablePath, 'utf-8'));
    const beforeCount = table.rows.length;

    const rowsToDelete = table.rows.filter(row =>
      Object.keys(where).every(k => row[k] === where[k])
    );

    // Check for cascade deletion
    if (options.cascade) {
      // Find tables that have relationships to this table
      const allTables = fs.readdirSync(currentDbPath)
        .filter(f => f.endsWith('.table') && f !== `${tableName}.table`);
      
      for (const tableFile of allTables) {
        const otherTablePath = path.join(currentDbPath, tableFile);
        const otherTable = JSON.parse(fs.readFileSync(otherTablePath, 'utf-8'));
        
        for (const [field, rel] of Object.entries(otherTable.relationships || {})) {
          if (rel.foreignTable === tableName) {
            // Delete rows in other table that reference deleted rows
            const idsToDelete = rowsToDelete.map(r => r.id);
            otherTable.rows = otherTable.rows.filter(row => 
              !idsToDelete.includes(row[field])
            );
            await writeFileAtomic(otherTablePath, JSON.stringify(otherTable, null, 2), { encoding: 'utf8' });
          }
        }
      }
    }

    table.rows = table.rows.filter(row =>
      !Object.keys(where).every(k => row[k] === where[k])
    );

    await writeFileAtomic(tablePath, JSON.stringify(table, null, 2), { encoding: 'utf8' });
    const deletedCount = beforeCount - table.rows.length;
    if (options.silent !== true) {
      console.log(`Deleted ${deletedCount} row(s) from "${tableName}"`);
    }
    
    return { count: deletedCount, rows: rowsToDelete };
  },

  // Add index for performance
  async addIndex(tableName, field, options = {}) {
    await db.ensureDb();
    const tablePath = path.join(currentDbPath, `${tableName}.table`);
    const table = JSON.parse(fs.readFileSync(tablePath, 'utf-8'));
    
    table.indexes[field] = {
      type: options.type || 'value',
      unique: options.unique || false,
      createdAt: new Date().toISOString()
    };
    
    // Build index
    if (options.type === 'hash') {
      const index = {};
      table.rows.forEach((row, idx) => {
        const key = row[field];
        if (key !== undefined) {
          if (!index[key]) index[key] = [];
          index[key].push(idx);
        }
      });
      table.indexes[field].data = index;
    }
    
    await writeFileAtomic(tablePath, JSON.stringify(table, null, 2), { encoding: 'utf8' });
    console.log(`Index added on "${field}" in "${tableName}"`);
    return db;
  },

  // Schema operations
  async addColumn(tableName, columnName, definition) {
    await db.ensureDb();
    const tablePath = path.join(currentDbPath, `${tableName}.table`);
    const table = JSON.parse(fs.readFileSync(tablePath, 'utf-8'));
    
    if (table.columns[columnName]) {
      throw new Error(`Column "${columnName}" already exists`);
    }
    
    table.columns[columnName] = typeof definition === 'string' 
      ? { type: definition }
      : definition;
    
    // Add default value to existing rows
    const defaultValue = definition.default !== undefined 
      ? (typeof definition.default === 'function' ? definition.default() : definition.default)
      : null;
    
    table.rows = table.rows.map(row => ({
      ...row,
      [columnName]: defaultValue
    }));
    
    await writeFileAtomic(tablePath, JSON.stringify(table, null, 2), { encoding: 'utf8' });
    console.log(`Added column "${columnName}" to "${tableName}"`);
    return db;
  },

  async removeColumn(tableName, columnName) {
    await db.ensureDb();
    const tablePath = path.join(currentDbPath, `${tableName}.table`);
    const table = JSON.parse(fs.readFileSync(tablePath, 'utf-8'));
    
    if (!table.columns[columnName]) {
      throw new Error(`Column "${columnName}" does not exist`);
    }
    
    delete table.columns[columnName];
    
    // Remove column from rows
    table.rows = table.rows.map(row => {
      const newRow = { ...row };
      delete newRow[columnName];
      return newRow;
    });
    
    await writeFileAtomic(tablePath, JSON.stringify(table, null, 2), { encoding: 'utf8' });
    console.log(`Removed column "${columnName}" from "${tableName}"`);
    return db;
  },

  // Backup current database
  async backup(backupPath = null) {
    await db.ensureDb();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = backupPath || path.join(DAPBASE_ROOT, '..', 'backups', `backup-${currentDb}-${timestamp}.zip`);
    
    const output = fs.createWriteStream(backupFile);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`Database "${currentDb}" backed up to: ${backupFile}`);
        resolve(backupFile);
      });
      
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(currentDbPath, currentDb);
      archive.finalize();
    });
  },

  // Utility methods
  _encryptField(value, key) {
    if (!key) return value;
    
    try {
      const cipher = crypto.createCipher('aes-256-cbc', key);
      let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return { encrypted: true, data: encrypted };
    } catch {
      return value;
    }
  },

  _decryptField(encryptedObj, key) {
    if (!encryptedObj.encrypted || !key) return encryptedObj;
    
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encryptedObj.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch {
      return encryptedObj;
    }
  },

  // Migration helper
  async migrate(tableName, migrationFn) {
    await db.ensureDb();
    const tablePath = path.join(currentDbPath, `${tableName}.table`);
    if (!fs.existsSync(tablePath)) throw new Error(`Table "${tableName}" not found`);
    
    const table = JSON.parse(fs.readFileSync(tablePath, 'utf-8'));
    
    // Apply migration to all rows
    table.rows = table.rows.map((row, index) => {
      try {
        return migrationFn(row, index, table.rows);
      } catch (error) {
        console.warn(`Migration failed for row ${row.id}:`, error.message);
        return row;
      }
    });
    
    await writeFileAtomic(tablePath, JSON.stringify(table, null, 2), { encoding: 'utf8' });
    console.log(`Migration applied to ${table.rows.length} rows in "${tableName}"`);
    return db;
  }
};

module.exports = db;