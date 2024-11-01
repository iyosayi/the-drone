import mongoose, {
  Document,
  FilterQuery,
  Model,
  PopulateOptions,
} from 'mongoose'

type IMongooseProjection =
  | string
  | string[]
  | Record<string, string | number | boolean | object>
  | null

export abstract class BaseRepository<T extends Document> {
  private session: mongoose.ClientSession
  constructor(private readonly model: Model<T>) {}

  /**
   * Converts a passed condition argument to a query
   * @param condition string or object condition
   */
  getQuery = (condition: string | object) =>
    typeof condition === 'string' ? { _id: condition } : { ...condition }

  getDBModel() {
    return this.model
  }

  /**
   * Connects to a DB Session
   * @param {import("mongoose").ClientSession} session
   */
  connectDBSession(session: mongoose.ClientSession) {
    this.session = session
    if (session && !session.inTransaction()) {
      session.startTransaction()
    }
    return this
  }

  /**
   * Disconnects from a DB Session
   */
  disconnectDBSession() {
    this.session = null
    return this
  }

  /**
   * Creates one or more documets.
   * @param {Partial<TModel>} attributes
   * @returns {Promise<TModel | import("mongoose").Document<TModel, any, any>>}
   */
  async create(attributes: any): Promise<T> {
    const [doc] = await this.model.create([attributes])
    return doc
  }

  /**
   * Creates one or more documets.
   * @param {Partial<TModel>} attributes
   * @returns {Promise<TModel | import("mongoose").Document<TModel, any, any>>}
   */
  async createMany(attributes: T[]): Promise<T[]> {
    return await this.model.insertMany(attributes, { session: this.session })
  }

  /**
   * Finds a document by it's id
   * @param {string} _id
   * @param {any} projections
   * @throws a `Error()` if the model is not found
   */
  byID(
    _id: string,
    projections?: IMongooseProjection,
    populate?: PopulateOptions | (string | PopulateOptions)[] | null,
  ) {
    return this.model
      .findOne({ _id, deletedAt: null })
      .select(projections)
      .session(this.session)
      .populate(populate)
  }

  /**
   * Finds a document by an object query.
   * @param {import("mongoose").FilterQuery<TModel>} query
   * @param {any} projections
   * @throws a `Error()` if the model is not found
   */
  async byQuery(
    query: FilterQuery<T>,
    projections?: IMongooseProjection,
    populate?: PopulateOptions | (string | PopulateOptions)[] | null,
  ) {
    const sort = query?.sort || 'createdAt'
    return this.model
      .findOne({ ...query, deletedAt: null })
      .sort(sort)
      .select(projections)
      .session(this.session)
      .populate(populate)
  }

  /**
   * Finds a document by an object query.
   * @param {import("mongoose").FilterQuery<TModel>} query
   * @param {any} projections
   * @param {import("mongoose").PopulateOptions} populate
   */
  byQueryOrNull(
    query: FilterQuery<T>,
    projections?:
      | string
      | string[]
      | Record<string, string | number | boolean | object>
      | null,
    populate?: PopulateOptions | (string | PopulateOptions)[] | null,
  ) {
    return this.model
      .findOne({ ...query, deletedAt: null })
      .select(projections)
      .populate(populate)
  }

  /**
   *
   * @param {boolean | string} archived
   * @returns
   */
  getArchivedConditions = (archived) =>
    !archived
      ? { deletedAt: undefined }
      : {
          $or: [{ deletedAt: { $ne: undefined } }, { deletedAt: undefined }],
        }

  /**
   *
   * @param {boolean | string} archived
   * @returns
   */
  getOnlyArchivedConditions = (archived) =>
    !archived ? { deletedAt: undefined } : { deletedAt: { $ne: undefined } }

  /**
   * Counts documents matching a query.
   * @param {import("mongoose").FilterQuery<TModel>} query
   * @returns {Promise<number>}
   */
  async count(query) {
    return this.model
      .countDocuments({
        ...query,
        deletedAt: null,
      })
      .session(this.session)
  }

  /**
   * Counts documents matching a query.
   * @param {string} field
   * @param {import("mongoose").FilterQuery<TModel>} query
   * @returns {Promise<string[]>}
   */
  async distinct(field, query) {
    return this.model
      .distinct(field, {
        ...query,
        deletedAt: null,
      })
      .session(this.session)
  }

  /**
   * Counts documents matching a query.
   * @param {string} field
   * @param {import("mongoose").FilterQuery<TModel>} query
   * @returns {Promise<number>}
   */
  countDistinct(field, query) {
    return this.distinct(field, query).then((ids) => ids.length)
  }

  /**
   * Returns true if a document exists, matching a query.
   * @param {import("mongoose").FilterQuery<TModel>} query
   */
  exists(query) {
    return this.model.exists(query)
  }

  /**
   * Finds all documents that match a query
   * @param {import("./types").PaginationQuery} query Query
   * @returns {Promise<TModel[]>}
   */
  async all(query) {
    const sort = query?.sort || 'createdAt'
    return this.model
      .find({
        ...query?.conditions,
        deletedAt: null,
      })
      .skip(query?.skip || 0)
      .limit(query?.limit || 0)
      .select(query?.projections)
      .populate(query?.populate)
      .sort(sort)
      .session(this.session)
  }

  /**
   * returns paginated results.
   * @param {import("./types").PaginationQuery} query Query
   * @returns {Promise<import("./types").PaginationResult<TModel>>}
   */
  async list(query) {
    const page = Math.max(Number(query.page), 1) || 1
    const limit = Math.max(Number(query.limit), 1) || 20
    const offset = (page - 1) * limit
    const sort = query.sort || 'createdAt'
    const dbQuery = { ...query.conditions, deletedAt: null }

    const count = await this.count(dbQuery)
    const docs = await this.model
      .find(dbQuery)
      .limit(limit)
      .select(query.projections)
      .populate(query.populate)
      .skip(offset)
      .sort(sort)

    const totalPages = Math.ceil(count / limit)

    return {
      page,
      limit,
      sort,
      docs,
      totalDocs: count,
      totalPages,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      offset,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
    }
  }

  /**
   * Updates a single document that matches a particular condition.
   * Triggers mongoose `save` hooks.
   * @param {string | object} condition
   * @param {any} update
   * @returns {Promise<TModel | import("mongoose").Document<TModel, any, any>>}
   * @throws {Error} a `Error()` if the model is not found
   */
  async update(condition, update) {
    const query = this.getQuery(condition)
    return await this.model.findOneAndUpdate(query, update, {
      session: this.session,
      new: true,
    })
  }

  /**
   * Allows the user of atomic operators such as $inc in updates.
   * Note: It does not trigger mongoose `save` hooks.
   * @param {string | object} condition Query condition to match against documents
   * @param {any} update The document update
   * @returns {Promise<TModel | import("mongoose").Document<TModel, any, any>>}
   * @throws a `Error()` if the model is not found
   */
  updateWithOperators(condition, update, opts = {}) {
    const query = this.getQuery(condition)
    return this.model.findOneAndUpdate(query, update, {
      new: true,
      upsert: true,
      runValidators: true,
      ...opts
    })
  }

  /**
   * Updates multiple documents that match a query
   * @param {string | object} condition Query condition to match against documents
   * @param {any} update The document update
   * @returns {Promise<TModel | import("mongoose").Document<TModel, any, any>>}
   */
  updateAll(condition, update) {
    const query = this.getQuery(condition)

    return this.model.updateMany(query, update, { session: this.session })
  }

  async updateOne(condition, update) {
    const query = this.getQuery(condition)
    return this.model.updateOne(query, update, {
      session: this.session,
      upsert: true,
      new: true,
    })
  }

  /**
   * Soft deletes a document by created `deletedAt` field in the document and setting it to true.
   * @param {string | object} condition Query condition to match against documents
   * @returns {Promise<TModel | import("mongoose").Document<TModel, any, any>>}
   * @throws a `Error()` if the model is not found
   */
  async remove(condition) {
    const query = this.getQuery(condition)

    return this.model.findOneAndUpdate(
      query,
      // @ts-ignore
      {
        deletedAt: new Date(),
      },
      {
        new: true,
        session: this.session,
      },
    )
  }

  /**
   * Permanently deletes a document by removing it from the collection(DB)
   * @param {string | object} condition Query condition to match against documents
   * @returns {Promise<TModel>}
   * @throws a `Error()` if the model is not found
   */
  destroy(condition) {
    return this.model
      .findOneAndDelete(this.getQuery(condition))
      .session(this.session)
  }

  /**
   * Permanently deletes multiple documents by removing them from the collection(DB)
   * @param {string | object} condition Query condition to match against documents
   * @returns {Promise<void>}
   * @throws a `Error()` if the model is not found
   */
  destroyAll(condition = {}) {
    const query = this.getQuery(condition)
    return this.model.deleteMany(query)
  }

  /**
   * Performs an aggregation on the collection
   * @param {array} pipeline
   * @returns
   */
  async aggregate(pipeline) {
    return await this.model.aggregate(pipeline)
  }

  async bulkUpdate(docs: { filter: any; update: any }[]) {
    const bulkOps = docs.map((user) => ({
      updateOne: {
        filter: user.filter,
        update: user.update,
      },
    }))

    const result = await this.model.bulkWrite(bulkOps)
    return result
  }
}
