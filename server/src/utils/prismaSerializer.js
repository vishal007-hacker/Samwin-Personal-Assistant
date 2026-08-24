// Recursively convert Prisma rows (whose primary key is named `id`, mapped to
// the `_id` column) back to the Mongoose-compatible shape the frontend expects.
//
// - `id`            -> `_id`
// - nested related rows (include/select) are converted as well
// - Json columns keep their stored shape (they already use `_id` where needed)

const serialize = (obj) => {
  if (Array.isArray(obj)) return obj.map(serialize);
  if (obj instanceof Date) return obj;
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'id') {
        out._id = value;
      } else {
        out[key] = serialize(value);
      }
    }
    return out;
  }
  return obj;
};

const one = (doc) => serialize(doc);
const many = (docs) => serialize(docs);

module.exports = { serialize, one, many };