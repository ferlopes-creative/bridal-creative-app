/**
 * Libera o app pra qualquer pessoa, mesmo sem login/cadastro e sem ter comprado nada —
 * sempre true, sem exceção. Conteúdo comprado continua bloqueado normalmente pra quem
 * não comprou; isso aqui só remove a parede de login pra navegar pelo catálogo.
 *
 * Importante: NÃO grava bridal_guest_mode aqui. Uma versão anterior chamava
 * setGuestMode(true) quando não achava sessão, o que "prendia" quem tinha conta de
 * verdade em modo convidado pra sempre caso o check de sessão corresse na frente da
 * hidratação do Supabase (reload lento, rede ruim) — uma vez gravado, isGuestMode()
 * nunca mais rechecava a sessão real, escondendo as compras de quem estava logada.
 * O flag de convidado deve continuar só refletindo o clique explícito em
 * "Convidado — entrar sem login" (ou signOut), nunca uma inferência daqui.
 */
export async function hasAppAccess(): Promise<boolean> {
  return true;
}
