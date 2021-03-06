// Importa comando padrão
const DefaultCommand = require('./Default')

// O comando inicial
class Init extends DefaultCommand {
  constructor () {
    super({
      options: {
        backStart (_Message, _config) {
          return {
            icon: 'home',
            name: Dictionary.get('general.init', _config),
            value: Dictionary.get('general.backStart', _config),
            callback: () => require('./Init').main(_Message, _config),
          }
        },
      },
    })
  }

  /**
   * @description Método principal
   * @param {Object} __Message O objeto da mensagem
   * @param {Object} _config As configurações do servidor
   */
  main (_Message, _config) {
    // Opções a serem exibidas
    const options = [
      {
        icon: 'dramaMasks',
        name: Dictionary.get('profile.profile', _config),
        value: Dictionary.get('profile.resume', _config),
        callback: () => require('./Profile').main(_Message, _config),
      },
      {
        icon: 'stream',
        name: Dictionary.get('stream.stream', _config),
        value: Dictionary.get('stream.resume', _config),
        callback: () => require('./Stream').main(_Message, _config),
      },
    ]

    // Se for dono do servidor, adiciona opção de configurações
    if (_Message.authorId() === _Message.serverOwnerID()) {
      options.push({
        icon: 'gear',
        name: Dictionary.get('config.config', _config),
        value: Dictionary.get('config.resume', _config),
        callback: () => require('./Config').main(_Message, _config),
      })
    }

    const defs = {
      title: Dictionary.get('general.index', _config),
      options,
    }

    // Envia um prompt e chama o comando solicitado
    _Message.sendPrompt(defs, _config)
  }
}

module.exports = new Init()