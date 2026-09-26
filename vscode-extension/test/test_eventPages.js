const { expect } = require('chai')
const { summarizePages, hasConditions, triggerLabel } = require('../out/db/eventPages')

const conditions = (o) => Object.assign({
  actorId: 1, actorValid: false, itemId: 1, itemValid: false, selfSwitchCh: 'A', selfSwitchValid: false,
  switch1Id: 1, switch1Valid: false, switch2Id: 1, switch2Valid: false, variableId: 1, variableValid: false, variableValue: 0
}, o)

describe('eventPages', function () {
  it('reads only the conditions that are turned on, and the trigger', function () {
    const event = {
      pages: [
        { conditions: conditions({}), trigger: 0 },
        { conditions: conditions({ switch1Valid: true, switch1Id: 12, variableValid: true, variableId: 5, variableValue: 3 }), trigger: 3 },
        { conditions: conditions({ selfSwitchValid: true, selfSwitchCh: 'B', itemValid: true, itemId: 4, actorValid: true, actorId: 2, switch2Valid: true, switch2Id: 7 }), trigger: 4 }
      ]
    }
    expect(summarizePages(event)).to.eql([
      { trigger: 0 },
      { trigger: 3, switch1: 12, variable: [5, 3] },
      { trigger: 4, switch2: 7, selfSwitch: 'B', item: 4, actor: 2 }
    ])
    expect(summarizePages(event).map(hasConditions)).to.eql([false, true, true])
    expect(triggerLabel(3)).to.equal('自動実行')
    expect(triggerLabel(9)).to.equal('決定ボタン')
  })

  it('does not break on odd data', function () {
    expect(summarizePages(null)).to.eql([])
    expect(summarizePages({ pages: [null, { trigger: 'x', conditions: conditions({ switch1Valid: true, switch1Id: 0 }) }] })).to.eql([{ trigger: 0 }, { trigger: 0 }])
  })
})
