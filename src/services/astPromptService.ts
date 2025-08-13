export class ASTPromptService {
	/**
	 * Generate AST prompt for Claude using the provided template
	 * @param htmlCode Generated HTML code
	 * @param cssCode Generated CSS code
	 * @param metaInfo Meta information from Claude analysis
	 * @returns Formatted prompt string
	 */
	generateASTPrompt(
		htmlCode: string,
		cssCode: string,
		metaInfo: string,
	): string {
		return `Задача:
Сгенерируй AST схему в формате json на основании следующей информации:
* html
* css
* мета-информации

На основании этой схемы мы будем создавать UI компоненты, поэтому создавай схему так, чтобы в будущем мы могли создать компоненты по best practice. 

Ничего не добавляй в схему от себя. Не улучшай. Создавай схему на основании той информации, которая тебе предоставлена. Однако ты можешь оптимизировать информацию: убирать дубликаты, реорганизовывать, чтобы составить подробную и правильную ast схему.

В мета-информации написано описание компонента, что это за компонент, зачем нужен и т.д. Это является основной информацией для тебя. 
Что касается стилей - основной для тебя информацией является css.
html являются дополнительной информацией для тебя о компоненте. В html может быть много ошибок. Не обращай на них внимание. Составляй ast схему так, чтобы в будущем на основании её можно было создать ui компоненты по best practices.

Пример AST который тебе нужно получить, но твой AST должен быть подробнее.
{
  "type": "Button",
  "properties": {
    "variant": {
      "type": "string",
      "enum": ["primary", "secondary", "outline", "ghost", "danger"],
      "default": "primary"
    },
    "size": {
      "type": "string", 
      "enum": ["small", "medium", "large"],
      "default": "medium"
    },
    "disabled": {
      "type": "boolean",
      "default": false
    },
    "children": {
      "type": "string",
      "required": true
    },
    "onClick": {
      "type": "function"
    }
  },
  "examples": [
    {
      "type": "Button",
      "props": {
        "variant": "primary",
        "children": "Сохранить"
      }
    },
    {
      "type": "Button", 
      "props": {
        "variant": "secondary",
        "size": "large",
        "children": "Отмена"
      }
    }
  ]
}

HTML:
${htmlCode}

CSS:
${cssCode}

Мета-информация:
${metaInfo}`;
	}
}
