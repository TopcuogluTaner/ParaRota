import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Icon} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useActiveHouseholdStore } from '@shared/store/useActiveHouseholdStore';
import { useMyHouseholdsQuery } from '@features/household/api/useHouseholds';
import { Eyebrow } from './Typography';

/**
 * Plan C "scope chip" — a tiny tag right above forms telling the user which
 * scope the record will be saved into. Echoes the Web `ScopeIndicator`.
 */
export function ScopeIndicator() {
  const { t } = useTranslation('common');
  const { colors } = useAppTheme();
  const activeId = useActiveHouseholdStore((s) => s.activeId);
  const householdsQ = useMyHouseholdsQuery();

  if (activeId != null && householdsQ.isLoading) return null;

  const household = activeId != null ? householdsQ.data?.find((h) => h.id === activeId) : null;
  const isHousehold = Boolean(household);

  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: isHousehold ? colors.goGlow : colors.paper2,
          borderColor: isHousehold ? colors.go : colors.line,
        },
      ]}
    >
      <Icon source={isHousehold ? 'account-group-outline' : 'account-outline'} size={11} color={isHousehold ? colors.go : colors.inkMute} />
      <Eyebrow tone={isHousehold ? 'go' : 'mute'} style={{ letterSpacing: 1.6 }}>
        {isHousehold ? `${t('scope_household')} · ${household?.name}` : t('scope_personal')}
      </Eyebrow>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
});
