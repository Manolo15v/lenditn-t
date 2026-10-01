db= db.getSibling("lendit");


db.createCollection("item_specs", {
    validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'category', 'attributes', 'conditionLog', 'updatedAt'],
      properties: {
        _id: { bsonType: 'string' },
        category: {
          enum: ['Calculators', 'Lab Coats', 'Drafting Kits', 'Soldering Irons', 'Other'],
        },
        attributes: { bsonType: 'object' },
        conditionLog: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['at', 'kind', 'byUserId', 'condition'],
            properties: {
              at: { bsonType: 'date' },
              kind: { enum: ['handover', 'return', 'inspection'] },
              loanId: { bsonType: 'string' },
              byUserId: { bsonType: 'string' },
              condition: { enum: ['new', 'good', 'worn', 'damaged'] },
              checklist: { bsonType: 'object' },
              notes: { bsonType: 'string' },
            },
          },
        },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  validationLevel: 'strict',
  validationAction: 'error',
})


db.item_specs.createIndex({category: 1})

db.item_specs.createIndex({"attributes.$**": 1})

db.item_specs.createIndex({"conditionLog.loanId": 1}, {sparse: true})