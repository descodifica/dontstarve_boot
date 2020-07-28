// Mapea um objeto
const objectMap = require('object.map')

// Converte um JSON para clausula where do SQL
const jsonToSqlWhere = require('@desco/json-to-sql-where')

// Importa conexão com o banco
const Db = require('../Db')

// Classe de entidade padrão
class Default {
  constructor () {
    // Recebe o nome da entidade
    this.entity = this.constructor.name
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
    * @param {Boolean} _log Se deve imprimir o log
    * @returns {Object} O resultado
    */
  create (_data, _log) {
    const columns = Object.keys(_data).join(', ')
    const values = Object.values(_data).map(i => typeof i === 'string' ? `"${i}"` : i).join(', ')

    // Executa SQL de criação e retorna o resultado
    return Db.query(`INSERT INTO ${this.table} (${columns}) VALUES (${values})`, _log)
  }

  /**
    * @description Atualiza um registro
    * @param {Object} _data Dados a serem gravados
    * @param {Object} _where Condições para gravar
    * @param {Boolean} _log Se deve imprimir o log
    * @returns {Promise} Promessa resolvida
    */
  update (_data, _where, _log) {
    // Se não tem dados, finaliza
    if (Object.keys(_data).length === 0) return Promise.resolve()

    const data = []

    // Monta treixo de atualização da SQL
    objectMap(_data, (v, k) => {
      // Se valor for string, adiciona aspas
      if (typeof v === 'string') {
        v = `"${v}"`
      }

      // Adiciona bem formatado ao array de registros
      data.push(`${k} = ${v}`)
    })

    // Executa SQL de atualização e retorna o resultado
    return Db.query(
      `UPDATE ${this.table} SET ${data.join(', ')} WHERE ${jsonToSqlWhere(_where)}`, _log
    )
  }
}

module.exports = Default