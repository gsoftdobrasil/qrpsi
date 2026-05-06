import {
  AppShell,
  Avatar,
  Burger,
  Button,
  Group,
  NavLink,
  ScrollArea,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBuilding,
  IconChartBar,
  IconLink,
  IconLogout,
  IconUsers,
} from "@tabler/icons-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ColorSchemeToggle } from "../components/ColorSchemeToggle";
import { useAuth } from "../context/AuthContext";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: IconChartBar },
  { to: "/empresas", label: "Empresas", icon: IconBuilding },
  { to: "/pesquisas", label: "Links / Pesquisas", icon: IconLink },
  { to: "/usuarios", label: "Usuários", icon: IconUsers },
];

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header
        px="md"
        py="xs"
        bg="var(--qrpsi-header-bg)"
        style={{ borderBottom: "1px solid var(--qrpsi-border-subtle)" }}
      >
        <Group h="100%" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4} c="indigo.6">
              QRPSI
            </Title>
            <Text size="sm" c="dimmed" visibleFrom="sm">
              Riscos Psicossociais
            </Text>
          </Group>
          <Group gap="sm">
            <ColorSchemeToggle size="md" />
            <Text size="sm" visibleFrom="sm">
              {user?.nome}
            </Text>
            <Avatar radius="xl" size="sm" color="indigo">
              {user?.nome?.charAt(0).toUpperCase()}
            </Avatar>
            <Button
              variant="light"
              color="gray"
              size="xs"
              leftSection={<IconLogout size={16} />}
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              Sair
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="xs"
        bg="var(--qrpsi-navbar-bg)"
        style={{ borderRight: "1px solid var(--qrpsi-border-subtle)" }}
      >
        <ScrollArea>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              href={item.to}
              label={item.label}
              leftSection={<item.icon size={18} stroke={1.5} />}
              active={
                item.to === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.to)
              }
              onClick={(e) => {
                e.preventDefault();
                navigate(item.to);
                close();
              }}
              variant="filled"
              color="indigo"
            />
          ))}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main bg="var(--mantine-color-body)">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
