import { z } from "zod";

export function initZodI18n() {
	z.config({
		// biome-ignore lint/suspicious/noExplicitAny: Zod issue object has varying shapes
		localeError: (issue: any) => {
			switch (issue.code) {
				case "too_small": {
					if (issue.origin === "string") {
						if (issue.minimum === 1) return "此项为必填项，内容不能为空";
						return `内容太短，至少需要 ${issue.minimum} 个字符`;
					}
					if (issue.origin === "number" || issue.origin === "bigint") {
						const limit = issue.inclusive
							? `>= ${issue.minimum}`
							: `> ${issue.minimum}`;
						return `数值过小，必须 ${limit}`;
					}
					return `数值或长度不足（不能低于 ${issue.minimum}）`;
				}
				case "too_big": {
					if (issue.origin === "string") {
						return `内容太长，最多允许 ${issue.maximum} 个字符`;
					}
					if (issue.origin === "number" || issue.origin === "bigint") {
						const limit = issue.inclusive
							? `<= ${issue.maximum}`
							: `< ${issue.maximum}`;
						return `数值过大，必须 ${limit}`;
					}
					return `数值或长度超出限制（最高 ${issue.maximum}）`;
				}
				case "invalid_type": {
					if (issue.input === undefined || issue.input === null) {
						return "此项为必做填或必选项";
					}
					return "输入格式不匹配";
				}
				case "invalid_format": {
					if (issue.format === "email") return "请输入有效的电子邮箱地址";
					if (issue.format === "url") return "请输入有效的网址链接";
					if (issue.format === "uuid") return "请输入有效的 UUID";
					return "输入格式非法";
				}
				case "invalid_value": {
					return "请选择有效的选项";
				}
				default:
					return "无效的输入";
			}
		},
	});
}
