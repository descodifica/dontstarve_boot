// Mapea um objeto
const objectMap = require('object.map')

// Converte um JSON para clausula where do SQL
const jsonToSqlWhere = require('@desco/json-to-sql-where')

// Importa conexão com o banco
const Db = require('../Db')

// Classe de entidade padrão
class Default {
  constructor ({ table, props, }) {
    // Recebe o nome da entidade
    this.entity = this.constructor.name.toLowerCase()

    // Recebe nome da tabela
    this.table = table

    // Recebe propriedades
    this.props = objectMap((props || {}), (i, k) => {
      if (typeof i === 'object') return i

      return { type: i, }
    })
  }

  /**
    * @description Retorna um registro dado um Id
    * @param {String} _id Id do registro a ser recuperado
    * @param {Boolean} _log Se deve imprimir o log
    * @returns {Object} O resultado
    */
  async get (_id, _log) {
    const result = await this.getBy({ id: _id, }, _log)

    return result[0]
  }

  /**
    * @description Retorna um registro dado um ou mais condições
    * @param {Object} _where Condições
    * @param {Boolean} _log Se deve imprimir o log
    * @returns {Object} O resultado
    */
  async getBy (_where, _log) {
    const result = await Db.query(
      `SELECT * FROM ${this.table} WHERE ${jsonToSqlWhere(_where)}`, _log
    )

    return result
  }

  /**
    * @description Cria um novo registro
    * @param {Object} _data Dados a serem gravados
    * @param {Object} _serverConfig Configurações do servidor
    * @param {Boolean} _log Se deve imprimir o log
    * @returns {Object} O resultado
    */
  create (_data, _serverConfig = {}, _log) {
    const columns = Object.keys(_data).join(', ')
    const values = Object.values(_data).map(i => typeof i === 'string' ? `"${i}"` : i).join(', ')

    // Executa SQL de criação e retorna o resultado
    return Db.query(`INSERT INTO ${this.table} (${columns}) VALUES (${values})`, _log)
  }

  /**
    * @description Atualiza um registro
    * @param {Object} _data Dados a serem gravados
    * @param {Object} _where Condições para gravar
    * @param {String} _method Nome do método que possui os registros
    * @param {Object} _serverConfig Configurações do servidor
    * @param {Boolean} _log Se deve imprimir o log
    * @returns {Promise} Promessa resolvida
    */
  update (_data, _where, _method, _serverConfig = {}, _log) {
    // Se não tem dados, finaliza
    if (Object.keys(_data).length === 0) return Promise.resolve()

    const data = []

    // Monta treixo de atualização da SQL
    objectMap(this.formatData(_data, _method, _serverConfig), (v, k) => {
      // Se valor for string, adiciona aspas
      if (typeof v === 'string') {
        v = `"${v}"`
      }
      // Se valor for indefinido, vira NULL
      else if (v === undefined) {
        v = null
      }

      // Adiciona bem formatado ao array de registros
      data.push(`${k} = ${v}`)
    })

    // SQL de atualização
    const sql = `UPDATE ${this.table} SET ${data.join(', ')} WHERE ${jsonToSqlWhere(_where)}`

    // Executa SQL e retorna o resultado
    return Db.query(sql, _log)
      .catch(e => Promise.reject(this.treatMySqlError(e, _method, _serverConfig)))
  }

  /**
   * @description Formata os registros
   * @param {String} _record Os registros a serem formatados
   * @param {String} _method Nome do método que possui os registros
   * @param {Object} _serverConfig Configurações do servidor
   * @returns {Object} Registros formatados
   */
  formatData (_record, _method, _serverConfig = {}) {
    const record = {}

    // Percorre todos os registros
    objectMap({ ..._record, }, (val, prop) => {
      // Traduz nome da propriedade para o real
      prop = Dictionary.getMethodParam(_serverConfig.lang, this.entity, _method, prop)

      // Se não consta na lista de propriedades, seta original
      if (!this.props[prop]) {
        record[prop] = val

        return
      }

      // Se for indefinido, seta string vazia
      if (val === undefined) {
        record[prop] = ''

        return
      }

      // Formata de acordo com o tipo
      switch (this.props[prop].type) {
        case 'Date': record[prop] = Dictionary.dateToEn(_serverConfig.lang, val)
          break
        default: record[prop] = val
      }
    })

    return record
  }

  /**
   * @description Trata um erro do MySql e retorna em padrão humano
   * @param {Error} _error O erro
   * @param {String} _error O método que invocou o erro
   * @param {Object} _serverConfig Configurações do servidor
   */
  treatMySqlError (_error, _method, _serverConfig) {
    // Torna o erro um array
    const error = _error.toString().split(' ')

    // Nome da propriedade que deu erro
    const prop = error[error.indexOf('column') + 1].slice(1, -1)

    // Nome traduzido da propriedade que deu erro
    const translateProp = Dictionary.getTranslateMethodParam(
      _serverConfig.lang, this.entity, _method, prop
    )

    // Tipo da propriedade que deu erro
    const type = (this.props[prop] || {}).type || this.props[prop] || 'String'

    // Tipo do erro
    const typeError = this.getMySqlErrorType(_error)

    // Retorna o erro adequado

    if (type === 'Option' && typeError === 'WARN_DATA_TRUNCATED') {
      return Dictionary.getMessage(_serverConfig.lang, 'general', 'INVALID_OPTION', {
        prop: translateProp,
        options: this.props[prop].values.slice(0, -1).join(', '),
        lastOption: this.props[prop].values.slice(-1).toString(),
      })
    }

    if (typeError === 'INCORRECT_DATE') {
      return Dictionary.getMessage(_serverConfig.lang, 'general', 'INVALID_DATE', {
        prop: translateProp,
      })
    }

    if (typeError === 'R_DATA_TOO_LONG') {
      return Dictionary.getMessage(_serverConfig.lang, 'general', 'LONG_TEXT', {
        prop: translateProp,
      })
    }

    if (typeError === 'INVALID_INTEGER') {
      return Dictionary.getMessage(_serverConfig.lang, 'general', 'INVALID_INTEGER', {
        prop: translateProp,
      })
    }
  }

  /**
   * @description Retorna o tipo de erro do MySql
   * @param {Error} _error O erro
   * @returns {String} O erro adequaddo
   */
  getMySqlErrorType (_error) {
    const error = _error.sqlMessage
    const errorCode = _error.code
    console.log(error)

    if (errorCode === 'WARN_DATA_TRUNCATED') {
      return 'WARN_DATA_TRUNCATED'
    }

    if (error.indexOf('Incorrect date value:') > -1) {
      return 'INCORRECT_DATE'
    }

    if (errorCode === 'R_DATA_TOO_LONG') {
      return 'R_DATA_TOO_LONG'
    }

    if (errorCode === 'R_DATA_TOO_LONG:') {
      return 'R_DATA_TOO_LONG'
    }

    if (error.indexOf('Incorrect integer value') > -1) {
      return 'INVALID_INTEGER'
    }
  }
}

module.exports = Default