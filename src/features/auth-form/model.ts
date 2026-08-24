/**
 * 폼 액션의 반환 형태. app 레이어의 Server Action이 이 타입을 만족시킨다.
 * (타입을 features가 소유해야 features → app 역방향 import가 생기지 않는다.)
 */
export interface AuthFormState {
  error: string | null;
}

export type AuthFormAction = (
  state: AuthFormState | null,
  formData: FormData
) => Promise<AuthFormState>;
